// Server-only DynamoDB access layer for the Spotlit content catalogue
// (features + creature presets). Anything imported from `$lib/server/...`
// is automatically excluded from the client bundle by SvelteKit.

import { env } from '$env/dynamic/private';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = env.CONTENT_TABLE;

function assertTable() {
  if (!TABLE) throw new Error('CONTENT_TABLE env var not set');
}
1
export async function getFeature(slug) {
  assertTable();
  const r = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { pk: `FEATURE#${slug}`, sk: 'META' },
  }));
  return r.Item ?? null;
}

export async function getCreature(slug) {
  assertTable();
  const r = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { pk: `CREATURE#${slug}`, sk: 'META' },
  }));
  return r.Item ?? null;
}

export const listFeatures  = () => listByEntity('feature');
export const listCreatures = () => listByEntity('creature');

async function listByEntity(entity) {
  assertTable();
  // GSI1 partitions by entity type and sorts by display name, so this
  // returns alphabetically-sorted features or creatures with one Query call.
  const items = [];
  let lastKey;
  do {
    const r = await ddb.send(new QueryCommand({
      TableName: TABLE,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :p',
      ExpressionAttributeValues: { ':p': entity },
      ExclusiveStartKey: lastKey,
    }));
    if (r.Items) items.push(...r.Items);
    lastKey = r.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

// Write paths (used by future authenticated endpoints; not yet exposed to UI).
// They auto-stamp metadata and increment the version counter.
export async function putFeature(item) {
  assertTable();
  const now = Date.now();
  const slug = item.slug;
  if (!slug) throw new Error('feature requires a slug');
  return ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      ...item,
      pk: `FEATURE#${slug}`,
      sk: 'META',
      gsi1pk: 'feature',
      gsi1sk: item.name,
      entity: 'feature',
      updatedAt: now,
      createdAt: item.createdAt ?? now,
      version: (item.version ?? 0) + 1,
    },
  }));
}

export async function putCreature(item) {
  assertTable();
  const now = Date.now();
  const slug = item.slug;
  if (!slug) throw new Error('creature requires a slug');
  return ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      ...item,
      pk: `CREATURE#${slug}`,
      sk: 'META',
      gsi1pk: 'creature',
      gsi1sk: item.name,
      entity: 'creature',
      updatedAt: now,
      createdAt: item.createdAt ?? now,
      version: (item.version ?? 0) + 1,
    },
  }));
}
