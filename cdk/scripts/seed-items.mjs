// One-off seeder for the inventory item catalogue.
//
// Reads an ITEMS array from `seed-items.local.mjs` (your private copy of the
// Daggerheart SRD weapon/armor/consumable/utility tables — kept out of git, the
// same way features/creatures are) and writes them to the SpotlitContent table
// under pk=ITEM#<slug>, gsi1pk='item'. Falls back to `seed-items.example.mjs`
// (committed sample data) when no local file is present, so the catalogue is
// never empty in a fresh environment.
//
// Idempotent: uses PutItem so re-running overwrites existing items.
//
// Usage:
//   node cdk/scripts/seed-items.mjs
//
// Requires AWS credentials (same ones cdk uses) and a deployed SpotlitCdkStack.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const STACK_NAME = 'SpotlitCdkStack';
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-west-2';

const ITEM_CATEGORIES = ['weapon', 'armor', 'consumable', 'utility'];

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[‘’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function discoverTableName() {
  const cf = new CloudFormationClient({ region: REGION });
  const out = await cf.send(new DescribeStacksCommand({ StackName: STACK_NAME }));
  const outputs = out.Stacks?.[0]?.Outputs ?? [];
  const found = outputs.find((o) => o.OutputKey === 'ContentTableName');
  if (!found?.OutputValue) throw new Error(`Stack ${STACK_NAME} has no ContentTableName output`);
  return found.OutputValue;
}

// Map a source row to a DynamoDB catalogue item, keeping only the fields that
// matter for the item's category so the table stays tidy.
function transformItems(ITEMS) {
  const now = Date.now();
  return ITEMS.map((raw) => {
    const name = raw.name;
    if (!name) throw new Error('every item needs a name');
    const category = ITEM_CATEGORIES.includes(raw.category) ? raw.category : 'utility';
    const slug = raw.slug || slugify(name);

    const item = {
      pk: `ITEM#${slug}`,
      sk: 'META',
      gsi1pk: 'item',
      gsi1sk: name,
      entity: 'item',
      slug,
      name,
      category,
      tier: Number(raw.tier) || 1,
      description: raw.description ?? '',
      feature: raw.feature ?? null,
      modifiers: raw.modifiers ?? {},
      source: 'builtin',
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    if (category === 'weapon') {
      item.weaponClass = raw.weaponClass === 'secondary' ? 'secondary' : 'primary';
      item.trait = raw.trait ?? 'Agility';
      item.range = raw.range ?? 'Melee';
      item.burden = Number(raw.burden) === 2 ? 2 : 1;
      item.damageDice = raw.damageDice ?? 'd6';
      item.damageBonus = Number(raw.damageBonus) || 0;
      item.damageType = raw.damageType === 'mag' ? 'mag' : 'phy';
    } else if (category === 'armor') {
      item.baseScore = Number(raw.baseScore) || 0;
      item.baseMajor = Number(raw.baseMajor) || 0;
      item.baseSevere = Number(raw.baseSevere) || 0;
    }

    return item;
  });
}

async function batchWrite(ddb, tableName, items) {
  const CHUNK = 25;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    const cmd = new BatchWriteCommand({
      RequestItems: { [tableName]: chunk.map((Item) => ({ PutRequest: { Item } })) },
    });
    let res = await ddb.send(cmd);
    let attempts = 0;
    while (res.UnprocessedItems && Object.keys(res.UnprocessedItems).length && attempts < 5) {
      attempts++;
      await new Promise((r) => setTimeout(r, 200 * attempts));
      res = await ddb.send(new BatchWriteCommand({ RequestItems: res.UnprocessedItems }));
    }
    if (res.UnprocessedItems && Object.keys(res.UnprocessedItems).length) {
      throw new Error(`Failed to write all items after retries (chunk starting at ${i})`);
    }
  }
}

async function main() {
  const localPath = resolve(__dirname, 'seed-items.local.mjs');
  const examplePath = resolve(__dirname, 'seed-items.example.mjs');
  const dataPath = existsSync(localPath) ? localPath : examplePath;
  const { ITEMS } = await import(pathToFileURL(dataPath).href);

  const items = transformItems(ITEMS);
  console.log(`Loaded ${items.length} items from ${dataPath === localPath ? 'seed-items.local.mjs' : 'seed-items.example.mjs (sample data)'}`);

  const tableName = await discoverTableName();
  console.log(`Target table: ${tableName} (${REGION})`);

  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
  console.log('Writing items...');
  await batchWrite(ddb, tableName, items);
  console.log(`Done. Wrote ${items.length} items.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
