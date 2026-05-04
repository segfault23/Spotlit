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

// Module-level promise cache: pre-made content never changes between deploys,
// so warm Lambda instances skip DynamoDB entirely after the first request.
let _featuresPromise  = null;
let _creaturesPromise = null;
let _ancestriesPromise = null;
let _communitiesPromise = null;
let _subclassesPromise = null;
let _domainsPromise = null;

export function listFeatures() {
  if (!_featuresPromise) {
    _featuresPromise = listByEntity('feature').catch(e => { _featuresPromise = null; throw e; });
  }
  return _featuresPromise;
}

export function listCreatures() {
  if (!_creaturesPromise) {
    _creaturesPromise = listByEntity('creature').catch(e => { _creaturesPromise = null; throw e; });
  }
  return _creaturesPromise;
}

export function listAncestries() {
  if (!_ancestriesPromise) {
    _ancestriesPromise = listByEntity('ancestry').catch(e => { _ancestriesPromise = null; throw e; });
  }
  return _ancestriesPromise;
}

export function listCommunities() {
  if (!_communitiesPromise) {
    _communitiesPromise = listByEntity('community').catch(e => { _communitiesPromise = null; throw e; });
  }
  return _communitiesPromise;
}

export function listSubclasses() {
  if (!_subclassesPromise) {
    _subclassesPromise = listByEntity('subclass').catch(e => { _subclassesPromise = null; throw e; });
  }
  return _subclassesPromise;
}

export function listDomains() {
  if (!_domainsPromise) {
    _domainsPromise = listByEntity('domainCard').catch(e => { _domainsPromise = null; throw e; });
  }
  return _domainsPromise;
}

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

export const listItems = () => listByEntity('item');

export async function getItem(slug) {
  assertTable();
  const r = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { pk: `ITEM#${slug}`, sk: 'META' },
  }));
  return r.Item ?? null;
}

export async function putItem(item) {
  assertTable();
  const now = Date.now();
  const slug = item.slug;
  if (!slug) throw new Error('item requires a slug');
  return ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      ...item,
      pk: `ITEM#${slug}`,
      sk: 'META',
      gsi1pk: 'item',
      gsi1sk: item.name,
      entity: 'item',
      updatedAt: now,
      createdAt: item.createdAt ?? now,
      version: (item.version ?? 0) + 1,
    },
  }));
}
