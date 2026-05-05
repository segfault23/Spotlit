// Seeder for Daggerheart card data (ancestry, community, subclass, domain cards).
//
// Card JSON files are NOT committed to the repository — pass their location via --data-dir.
// Idempotent: uses PutItem so re-running safely overwrites existing items.
//
// Usage:
//   node cdk/scripts/seed-cards.mjs --data-dir "C:\Users\josh0\Downloads"
//
// Requires:
//   - AWS credentials configured (same ones cdk uses)
//   - The four JSON files in --data-dir:
//       ancestry_cards.json, community_cards.json, subclass_cards.json, domain_cards.json

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STACK_NAME = 'SpotlitCdkStack';
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-west-2';

function parseArgs() {
    const args = process.argv.slice(2);
    const idx = args.indexOf('--data-dir');
    if (idx === -1 || !args[idx + 1]) {
        console.error('Usage: node cdk/scripts/seed-cards.mjs --data-dir <path>');
        process.exit(1);
    }
    return resolve(args[idx + 1]);
}

function readJson(dir, filename) {
    const path = resolve(dir, filename);
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch (err) {
        console.error(`Failed to read ${path}: ${err.message}`);
        process.exit(1);
    }
}

async function discoverTableName() {
    const cf = new CloudFormationClient({ region: REGION });
    const out = await cf.send(new DescribeStacksCommand({ StackName: STACK_NAME }));
    const outputs = out.Stacks?.[0]?.Outputs ?? [];
    const found = outputs.find(o => o.OutputKey === 'ContentTableName');
    if (!found?.OutputValue) throw new Error(`Stack ${STACK_NAME} has no ContentTableName output`);
    return found.OutputValue;
}

function padLevel(level) {
    return String(level).padStart(2, '0');
}

function transformAncestries(ancestries) {
    const now = Date.now();
    return ancestries.map(a => ({
        pk: `ANCESTRY#${a.name}`,
        sk: 'META',
        name: a.name,
        description: a.description,
        abilities: a.abilities,
        updatedAt: now,
        gsi1pk: 'ancestry',
        gsi1sk: a.name,
    }));
}

function transformCommunities(communities) {
    const now = Date.now();
    return communities.map(c => ({
        pk: `COMMUNITY#${c.name}`,
        sk: 'META',
        name: c.name,
        description: c.description,
        features: c.features,
        updatedAt: now,
        gsi1pk: 'community',
        gsi1sk: c.name,
    }));
}

function transformSubclasses(subclasses) {
    const now = Date.now();
    return subclasses.map(s => ({
        pk: `SUBCLASS#${s.class}#${s.subclass}#${s.tier}`,
        sk: 'META',
        class: s.class,
        subclass: s.subclass,
        tier: s.tier,
        domains: s.domains,
        spellcastTrait: s.spellcast_trait ?? null,
        features: s.features,
        updatedAt: now,
        gsi1pk: 'subclass',
        gsi1sk: s.subclass,
    }));
}

function transformDomainCards(cards) {
    const now = Date.now();
    return cards.map(c => {
        const item = {
            // Zero-pad level so lexicographic sort == numeric sort for range queries
            pk: `DOMAIN#${c.domain_icon}#LEVEL#${padLevel(c.level)}#${c.name}`,
            sk: `META`,
            name: c.name,
            domain: c.domain_icon,
            level: c.level,
            stressCost: c.stress_cost,
            type: c.type,
            ...(c.resource !== undefined && { resource: c.resource }),
            updatedAt: now,
            gsi1pk: 'domainCard',
            gsi1sk: c.name,
        };
        if (c.type === 'Grimoire') {
            item.abilities = c.abilities;
        } else {
            item.text = c.text;
        }
        return item;
    });
}

async function batchWrite(ddb, tableName, items) {
    const CHUNK = 25;
    for (let i = 0; i < items.length; i += CHUNK) {
        const chunk = items.slice(i, i + CHUNK);
        const cmd = new BatchWriteCommand({
            RequestItems: {
                [tableName]: chunk.map(Item => ({ PutRequest: { Item } })),
            },
        });
        let res = await ddb.send(cmd);
        let attempts = 0;
        while (res.UnprocessedItems && Object.keys(res.UnprocessedItems).length && attempts < 5) {
            attempts++;
            await new Promise(r => setTimeout(r, 200 * attempts));
            res = await ddb.send(new BatchWriteCommand({ RequestItems: res.UnprocessedItems }));
        }
        if (res.UnprocessedItems && Object.keys(res.UnprocessedItems).length) {
            throw new Error(`Failed to write all items after retries (chunk starting at ${i})`);
        }
        process.stdout.write('.');
    }
    process.stdout.write('\n');
}

async function main() {
    const dataDir = parseArgs();
    console.log(`Reading card data from: ${dataDir}`);

    const ancestries = readJson(dataDir, 'ancestry_cards.json');
    const communities = readJson(dataDir, 'community_cards.json');
    const subclasses = readJson(dataDir, 'subclass_cards.json');
    const domainCards = readJson(dataDir, 'domain_cards.json');

    const items = [
        ...transformAncestries(ancestries),
        ...transformCommunities(communities),
        ...transformSubclasses(subclasses),
        ...transformDomainCards(domainCards),
    ];

    console.log(`Loaded:`);
    console.log(`  ${ancestries.length} ancestries`);
    console.log(`  ${communities.length} communities`);
    console.log(`  ${subclasses.length} subclass tiers`);
    console.log(`  ${domainCards.length} domain cards`);
    console.log(`  ${items.length} total items`);

    const tableName = await discoverTableName();
    console.log(`\nTarget table: ${tableName} (${REGION})`);

    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

    console.log('Writing ancestries...');
    await batchWrite(ddb, tableName, transformAncestries(ancestries));
    console.log('Writing communities...');
    await batchWrite(ddb, tableName, transformCommunities(communities));
    console.log('Writing subclass tiers...');
    await batchWrite(ddb, tableName, transformSubclasses(subclasses));
    console.log('Writing domain cards...');
    await batchWrite(ddb, tableName, transformDomainCards(domainCards));

    console.log(`\nDone. Wrote ${items.length} items to ${tableName}.`);
}

main().catch(err => { console.error(err); process.exit(1); });
