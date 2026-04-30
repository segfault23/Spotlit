// DynamoDB access layer for per-user data.
// All items live in the same SpotlitContent table under pk = USER#<sub>.
//
// Key shapes:
//   Encounter       pk=USER#<sub>  sk=ENCOUNTER#<iso>#<uuid8>
//   Roster          pk=USER#<sub>  sk=PROFILE#ROSTER
//   Custom creature pk=USER#<sub>  sk=CUSTOM_CREATURE#<slug>
//   Campaign        pk=USER#<sub>  sk=CAMPAIGN#<iso>#<uuid8>
//                   gsi1pk=JOINCODE#<code>  gsi1sk=META
//   Character       pk=USER#<sub>  sk=CHARACTER#<iso>#<uuid8>
//                   gsi1pk=CAMPAIGN#<code>  gsi1sk=<name>  (only when in a campaign)
//   Custom item     pk=USER#<sub>  sk=CUSTOM_ITEM#<slug>

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
  })).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
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

// ── Custom adversaries ────────────────────────────────────────────────────────────

export async function listCustomCreatures(sub) {
  const r = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :pfx)',
    ExpressionAttributeValues: { ':pk': `USER#${sub}`, ':pfx': 'CUSTOM_CREATURE#' },
    ScanIndexForward: true,
  }));
  return r.Items ?? [];
}

export async function getCustomCreature(sub, slug) {
  const r = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { pk: `USER#${sub}`, sk: `CUSTOM_CREATURE#${slug}` },
  }));
  return r.Item ?? null;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function putCustomCreature(sub, creature, existingSlug = null) {
  const slug = slugify(creature.name);
  const now = Date.now();

  // Renamed → delete old key first so we don't leave a duplicate item behind
  if (existingSlug && existingSlug !== slug) {
    await deleteCustomCreature(sub, existingSlug);
  }

  // Preserve createdAt across renames; set it for brand-new items
  const existing = existingSlug ? await getCustomCreature(sub, existingSlug) : null;
  const createdAt = existing?.createdAt ?? now;

  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      pk: `USER#${sub}`,
      sk: `CUSTOM_CREATURE#${slug}`,
      slug,
      ...creature,
      createdAt,
      updatedAt: now,
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

// ── Custom features ───────────────────────────────────────────────────────────────

export async function listCustomFeatures(sub) {
  const r = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :pfx)',
    ExpressionAttributeValues: { ':pk': `USER#${sub}`, ':pfx': 'CUSTOM_FEATURE#' },
    ScanIndexForward: true,
  }));
  return r.Items ?? [];
}

export async function getCustomFeature(sub, slug) {
  const r = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { pk: `USER#${sub}`, sk: `CUSTOM_FEATURE#${slug}` },
  }));
  return r.Item ?? null;
}

export async function putCustomFeature(sub, feature, existingSlug = null) {
  const slug = slugify(feature.name);
  const now = Date.now();

  if (existingSlug && existingSlug !== slug) {
    await deleteCustomFeature(sub, existingSlug);
  }

  const existing = existingSlug ? await getCustomFeature(sub, existingSlug) : null;
  const createdAt = existing?.createdAt ?? now;

  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      pk: `USER#${sub}`,
      sk: `CUSTOM_FEATURE#${slug}`,
      slug,
      ...feature,
      createdAt,
      updatedAt: now,
    },
  }));
  return slug;
}

export async function deleteCustomFeature(sub, slug) {
  await ddb.send(new DeleteCommand({
    TableName: TABLE,
    Key: { pk: `USER#${sub}`, sk: `CUSTOM_FEATURE#${slug}` },
  }));
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

function genJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function listCampaigns(gmSub) {
  const r = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :pfx)',
      ExpressionAttributeValues: { ':pk': `USER#${gmSub}`, ':pfx': 'CAMPAIGN#' },
      ScanIndexForward: false,
    })
  );
  return r.Items ?? [];
}

export async function getCampaign(gmSub, id) {
  const r = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { pk: `USER#${gmSub}`, sk: id } })
  );
  return r.Item ?? null;
}

export async function getCampaignByCode(code, gmSub) {
  const item = await getCampaignByJoinCode(code);
  if (!item || item.gmSub !== gmSub) return null;
  return item;
}

export async function getCampaignByJoinCode(code) {
  const r = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :p AND gsi1sk = :s',
      ExpressionAttributeValues: { ':p': `JOINCODE#${code}`, ':s': 'META' },
      Limit: 1,
    })
  );
  return r.Items?.[0] ?? null;
}

export async function putCampaign(gmSub, data, existingId = null) {
  const now = Date.now();
  const id = existingId ?? `CAMPAIGN#${new Date(now).toISOString()}#${randomUUID().slice(0, 8)}`;
  const existing = existingId ? await getCampaign(gmSub, existingId) : null;
  const joinCode = existing?.joinCode ?? genJoinCode();
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        pk: `USER#${gmSub}`,
        sk: id,
        gsi1pk: `JOINCODE#${joinCode}`,
        gsi1sk: 'META',
        id,
        gmSub,
        joinCode,
        name: data.name ?? 'Untitled Campaign',
        description: data.description ?? '',
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      },
    })
  );
  return { id, joinCode };
}

export async function deleteCampaign(gmSub, id) {
  await ddb.send(
    new DeleteCommand({ TableName: TABLE, Key: { pk: `USER#${gmSub}`, sk: id } })
  );
}

// ── Characters ────────────────────────────────────────────────────────────────

const DEFAULT_CHARACTER = {
  name: '',
  playerName: '',
  class: '',
  subclass: '',
  level: 1,
  ancestry: '',
  community: '',
  pronouns: '',
  agility: 0, strength: 0, finesse: 0, instinct: 0, presence: 0, knowledge: 0,
  maxHP: 6, hp: 6,
  maxStress: 3, stress: 0,
  maxHope: 5, hope: 5,
  evasion: 10,
  armorSlots: 0, armorUsed: 0,
  gold: 0,
  experiences: [{ text: '', modifier: 0 }, { text: '', modifier: 0 }, { text: '', modifier: 0 }],
  features: [],
  thresholds: { minor: 0, major: 0, severe: 0 },
  items: [],
  profilePhoto: null,
  gallery: [],
  notes: '',
};

export async function listMyCharacters(ownerSub) {
  const r = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :pfx)',
      ExpressionAttributeValues: { ':pk': `USER#${ownerSub}`, ':pfx': 'CHARACTER#' },
      ScanIndexForward: false,
    })
  );
  return r.Items ?? [];
}

export async function listCampaignCharacters(joinCode) {
  const r = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :p',
      ExpressionAttributeValues: { ':p': `CAMPAIGN#${joinCode}` },
      ScanIndexForward: true,
    })
  );
  return r.Items ?? [];
}

export async function getCharacter(ownerSub, id) {
  const r = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { pk: `USER#${ownerSub}`, sk: id } })
  );
  return r.Item ?? null;
}

export async function getCharacterAsGm(gmSub, ownerSub, id) {
  const item = await getCharacter(ownerSub, id);
  if (!item) return null;
  // Primary check: stored campaignGmSub
  if (item.campaignGmSub === gmSub) return item;
  // Fallback: verify ownership via campaign lookup (handles stripped campaignGmSub)
  if (item.campaignCode) {
    const campaign = await getCampaignByCode(item.campaignCode, gmSub);
    if (campaign) return item;
  }
  return null;
}

export async function putCharacter(ownerSub, data, existingId = null) {
  const now = Date.now();
  const id = existingId ?? `CHARACTER#${new Date(now).toISOString()}#${randomUUID().slice(0, 8)}`;
  const existing = existingId ? await getCharacter(ownerSub, id) : null;

  const char = {
    ...DEFAULT_CHARACTER,
    ...data,
    pk: `USER#${ownerSub}`,
    sk: id,
    id,
    ownerSub,
    // Preserve campaign link from existing record when not in payload
    campaignCode:   data.campaignCode   ?? existing?.campaignCode,
    campaignGmSub:  data.campaignGmSub  ?? existing?.campaignGmSub,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (char.campaignCode) {
    char.gsi1pk = `CAMPAIGN#${char.campaignCode}`;
    char.gsi1sk = char.name || '';
  } else {
    delete char.gsi1pk;
    delete char.gsi1sk;
  }

  await ddb.send(new PutCommand({ TableName: TABLE, Item: char }));
  return id;
}

export async function deleteCharacter(ownerSub, id) {
  await ddb.send(
    new DeleteCommand({ TableName: TABLE, Key: { pk: `USER#${ownerSub}`, sk: id } })
  );
}

// ── Custom items ──────────────────────────────────────────────────────────────

export async function listCustomItems(sub) {
  const r = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :pfx)',
      ExpressionAttributeValues: { ':pk': `USER#${sub}`, ':pfx': 'CUSTOM_ITEM#' },
      ScanIndexForward: true,
    })
  );
  return r.Items ?? [];
}

export async function getCustomItem(sub, slug) {
  const r = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { pk: `USER#${sub}`, sk: `CUSTOM_ITEM#${slug}` } })
  );
  return r.Item ?? null;
}

export async function putCustomItem(sub, item, existingSlug = null) {
  const slug = slugify(item.name);
  const now = Date.now();
  if (existingSlug && existingSlug !== slug) await deleteCustomItem(sub, existingSlug);
  const existing = existingSlug ? await getCustomItem(sub, existingSlug) : null;
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        pk: `USER#${sub}`,
        sk: `CUSTOM_ITEM#${slug}`,
        slug,
        ...item,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      },
    })
  );
  return slug;
}

export async function deleteCustomItem(sub, slug) {
  await ddb.send(
    new DeleteCommand({ TableName: TABLE, Key: { pk: `USER#${sub}`, sk: `CUSTOM_ITEM#${slug}` } })
  );
}

export { slugify };
