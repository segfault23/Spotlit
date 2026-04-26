// DynamoDB access layer for per-user data.
// All items live in the same SpotlitContent table under pk = USER#<sub>.
//
// Key shapes:
//   Encounter       pk=USER#<sub>  sk=ENCOUNTER#<iso>#<uuid8>
//   Roster          pk=USER#<sub>  sk=PROFILE#ROSTER
//   Custom creature pk=USER#<sub>  sk=CUSTOM_CREATURE#<slug>

import { env } from '$env/dynamic/private';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = env.CONTENT_TABLE;

// ── Encounters ────────────────────────────────────────────────────────────────

export async function listEncounters(sub) {
  const r = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :pfx)',
    ExpressionAttributeValues: { ':pk': `USER#${sub}`, ':pfx': 'ENCOUNTER#' },
    ProjectionExpression: 'sk, #n, updatedAt',
    ExpressionAttributeNames: { '#n': 'name' },
    ScanIndexForward: false,
  }));
  return (r.Items ?? []).map(item => ({
    id: item.sk,
    name: item.name,
    updatedAt: item.updatedAt,
  }));
}

export async function loadEncounter(sub, id) {
  const r = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { pk: `USER#${sub}`, sk: id },
  }));
  return r.Item ?? null;
}

export async function saveEncounter(sub, state, existingId = null) {
  const now = Date.now();
  if (existingId) {
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { pk: `USER#${sub}`, sk: existingId },
      UpdateExpression: 'SET #nm = :nm, #st = :st, updatedAt = :now',
      ExpressionAttributeNames: { '#nm': 'name', '#st': 'state' },
      ExpressionAttributeValues: {
        ':nm': state.encounterName || 'Untitled',
        ':st': state,
        ':now': now,
      },
    }));
    return existingId;
  }
  const id = `ENCOUNTER#${new Date(now).toISOString()}#${randomUUID().slice(0, 8)}`;
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      pk: `USER#${sub}`,
      sk: id,
      name: state.encounterName || 'Untitled',
      state,
      createdAt: now,
      updatedAt: now,
    },
  }));
  return id;
}

export async function deleteEncounter(sub, id) {
  await ddb.send(new DeleteCommand({
    TableName: TABLE,
    Key: { pk: `USER#${sub}`, sk: id },
  }));
}

// ── Roster ────────────────────────────────────────────────────────────────────

export async function getRoster(sub) {
  const r = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { pk: `USER#${sub}`, sk: 'PROFILE#ROSTER' },
  }));
  return r.Item?.characters ?? [];
}

export async function putRoster(sub, characters) {
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { pk: `USER#${sub}`, sk: 'PROFILE#ROSTER', characters, updatedAt: Date.now() },
  }));
}

// ── Custom adversaries ────────────────────────────────────────────────────────

export async function listCustomCreatures(sub) {
  const r = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :pfx)',
    ExpressionAttributeValues: { ':pk': `USER#${sub}`, ':pfx': 'CUSTOM_CREATURE#' },
    ScanIndexForward: true,
  }));
  return r.Items ?? [];
}

export async function putCustomCreature(sub, creature) {
  const slug = creature.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      pk: `USER#${sub}`,
      sk: `CUSTOM_CREATURE#${slug}`,
      slug,
      ...creature,
      updatedAt: Date.now(),
    },
  }));
  return slug;
}

export async function deleteCustomCreature(sub, slug) {
  await ddb.send(new DeleteCommand({
    TableName: TABLE,
    Key: { pk: `USER#${sub}`, sk: `CUSTOM_CREATURE#${slug}` },
  }));
}
