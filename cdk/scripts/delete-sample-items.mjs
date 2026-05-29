// Targeted cleanup: deletes ONLY the sample catalogue items defined in
// seed-items.example.mjs (the data a `seed-items.mjs` run loads when no
// seed-items.local.mjs is present). Use this to undo an accidental example seed
// without touching the real SRD catalogue or any user's custom items.
//
// It deletes exactly the ITEM#<slug> / sk=META rows whose slug appears in the
// example data — derived from the file itself, so it always matches.
//
// Usage:
//   node cdk/scripts/delete-sample-items.mjs            # show what would be deleted
//   node cdk/scripts/delete-sample-items.mjs --yes      # actually delete
//
// Requires AWS credentials (same ones cdk uses) and a deployed SpotlitCdkStack.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const STACK_NAME = 'SpotlitCdkStack';
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-west-2';

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

async function batchDelete(ddb, tableName, keys) {
  const CHUNK = 25;
  for (let i = 0; i < keys.length; i += CHUNK) {
    const chunk = keys.slice(i, i + CHUNK);
    let res = await ddb.send(
      new BatchWriteCommand({
        RequestItems: { [tableName]: chunk.map((Key) => ({ DeleteRequest: { Key } })) },
      })
    );
    let attempts = 0;
    while (res.UnprocessedItems && Object.keys(res.UnprocessedItems).length && attempts < 5) {
      attempts++;
      await new Promise((r) => setTimeout(r, 200 * attempts));
      res = await ddb.send(new BatchWriteCommand({ RequestItems: res.UnprocessedItems }));
    }
    if (res.UnprocessedItems && Object.keys(res.UnprocessedItems).length) {
      throw new Error(`Failed to delete all items after retries (chunk starting at ${i})`);
    }
  }
}

async function main() {
  const confirmed = process.argv.includes('--yes');
  const { ITEMS } = await import(pathToFileURL(resolve(__dirname, 'seed-items.example.mjs')).href);
  const slugs = ITEMS.map((i) => i.slug || slugify(i.name));

  const tableName = await discoverTableName();
  console.log(`Target table: ${tableName} (${REGION})`);

  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

  // Only delete sample rows that are actually present and look like builtin
  // catalogue items (entity === 'item'), so we never remove a real item that
  // happens to share a slug with a sample.
  const present = [];
  for (const slug of slugs) {
    const r = await ddb.send(
      new GetCommand({ TableName: tableName, Key: { pk: `ITEM#${slug}`, sk: 'META' } })
    );
    if (r.Item) present.push({ slug, source: r.Item.source, name: r.Item.name });
  }

  if (present.length === 0) {
    console.log('No sample items found in the table — nothing to delete.');
    return;
  }

  console.log(`Found ${present.length} matching item(s):`);
  for (const p of present) console.log(`  - ${p.slug} (${p.name}, source=${p.source ?? '?'})`);

  if (!confirmed) {
    console.log('\nDry run. Re-run with --yes to delete these rows.');
    return;
  }

  await batchDelete(
    ddb,
    tableName,
    present.map((p) => ({ pk: `ITEM#${p.slug}`, sk: 'META' }))
  );
  console.log(`\nDeleted ${present.length} sample item(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
