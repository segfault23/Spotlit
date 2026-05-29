// Converts the Daggerheart SRD Items Compendium markdown into the inventory
// catalogue format consumed by `seed-items.mjs`, writing the result to
// `seed-items.local.mjs` (gitignored — the SRD data is never committed).
//
// This script contains only parsing logic, no SRD content, so it is safe to
// commit. Re-run it whenever the source compendium changes.
//
// Usage:
//   node cdk/scripts/items-from-srd.mjs <path/to/SRD_Items_Compendium.md> [--out <file>]
//
// Then push the generated catalogue to DynamoDB with:
//   node cdk/scripts/seed-items.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TRAITS = ['Agility', 'Strength', 'Finesse', 'Instinct', 'Presence', 'Knowledge'];

// Normalize the SRD's unicode minus (−, U+2212) to ASCII so number parsing works.
function norm(s) {
  return String(s ?? '').replace(/−/g, '-').trim();
}

function slugify(name) {
  return norm(name)
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Pull flat, always-on stat modifiers out of a feature / effect description.
// Anything we don't recognise is left as descriptive text only.
function parseModifiers(text) {
  const t = norm(text);
  const mods = {};
  if (!t) return mods;

  const add = (key, n) => {
    if (Number.isFinite(n) && n !== 0) mods[key] = (mods[key] ?? 0) + n;
  };

  // "−1 to all character traits and Evasion" (Savior Chainmail / Difficult).
  const allMatch = t.match(/([+-]\d+)\s+to\s+all\s+character\s+traits/i);
  if (allMatch) {
    const n = parseInt(allMatch[1], 10);
    for (const tr of TRAITS) add(tr.toLowerCase(), n);
    if (/and\s+Evasion/i.test(t)) add('evasion', n);
  }

  const eva = t.match(/([+-]\d+)\s+to\s+Evasion/i);
  if (eva) add('evasion', parseInt(eva[1], 10));

  const score = t.match(/([+-]\d+)\s+to\s+Armor Score/i);
  if (score) add('armorScore', parseInt(score[1], 10));

  const severe = t.match(/([+-]\d+)\s+to\s+Severe damage threshold/i);
  if (severe) add('thresholdSevere', parseInt(severe[1], 10));
  const major = t.match(/([+-]\d+)\s+to\s+Major damage threshold/i);
  if (major) add('thresholdMajor', parseInt(major[1], 10));

  // Per-trait bonuses ("+1 to Agility", relic boosts, etc.) — skip if the
  // "all traits" rule already covered everything.
  if (!allMatch) {
    const re = new RegExp(`([+-]\\d+)\\s+to\\s+(${TRAITS.join('|')})\\b`, 'ig');
    let m;
    while ((m = re.exec(t)) !== null) add(m[2].toLowerCase(), parseInt(m[1], 10));
  }

  return mods;
}

// "Reliable: +1 to attack rolls" → { name: 'Reliable', text: '+1 to attack rolls' }
function parseFeature(raw) {
  const t = norm(raw);
  if (!t || t === '—' || t === '-') return null;
  const idx = t.indexOf(':');
  if (idx === -1) return { name: t, text: '' };
  return { name: t.slice(0, idx).trim(), text: t.slice(idx + 1).trim() };
}

// "d10+3 phy" → { damageDice:'d10', damageBonus:3, damageType:'phy' }
function parseDamage(raw, fallbackType) {
  const t = norm(raw);
  const dice = t.match(/d\d+/i)?.[0] ?? 'd6';
  const bonus = t.match(/[+]\s*(\d+)/)?.[1];
  const type = /\bmag\b/i.test(t) ? 'mag' : /\bphy\b/i.test(t) ? 'phy' : fallbackType ?? 'phy';
  return { damageDice: dice.toLowerCase(), damageBonus: bonus ? parseInt(bonus, 10) : 0, damageType: type };
}

function parseBurden(raw) {
  return /two/i.test(norm(raw)) ? 2 : 1;
}

// ── Markdown table walker ─────────────────────────────────────────────────────
const SEPARATOR = /^\|[\s:|-]+\|?$/;

function parse(md) {
  const lines = md.split(/\r?\n/);
  const items = [];

  let section = null; // 'primary' | 'secondary' | 'wheelchair' | 'armor' | 'loot' | 'consumable'
  let magic = false; // current weapon section is the magic table
  let tier = 1;
  let header = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith('## ')) {
      header = null;
      const h = line.slice(3).toLowerCase();
      magic = h.includes('magic');
      if (h.includes('primary weapons')) section = 'primary';
      else if (h.includes('secondary weapons')) section = 'secondary';
      else if (h.includes('combat wheelchair')) section = 'wheelchair';
      else if (h.startsWith('armor')) section = 'armor';
      else if (h.startsWith('loot')) section = 'loot';
      else if (h.startsWith('consumable')) section = 'consumable';
      else section = null;
      continue;
    }

    if (line.startsWith('### ')) {
      header = null;
      const m = line.match(/tier\s+(\d+)/i);
      if (m) tier = parseInt(m[1], 10);
      continue;
    }

    if (!line.startsWith('|')) {
      header = null;
      continue;
    }

    if (SEPARATOR.test(line)) continue;

    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (!header) {
      header = cells.map((c) => c.toLowerCase());
      continue;
    }

    const row = {};
    header.forEach((key, i) => (row[key] = cells[i] ?? ''));
    const item = rowToItem(row, { section, magic, tier });
    if (item) items.push(item);
  }

  return items;
}

function rowToItem(row, { section, magic, tier }) {
  const name = norm(row['name'] || row['item']);
  if (!name) return null;

  // Wheelchair tables carry their own Tier column.
  const rowTier = row['tier'] ? parseInt(row['tier'], 10) : tier;

  if (section === 'primary' || section === 'secondary' || section === 'wheelchair') {
    const dmg = parseDamage(row['damage'], magic ? 'mag' : 'phy');
    const feature = parseFeature(row['feature']);
    const item = {
      name,
      slug: slugify(name),
      category: 'weapon',
      tier: rowTier || 1,
      weaponClass: section === 'secondary' ? 'secondary' : 'primary',
      trait: norm(row['trait']) || 'Agility',
      range: norm(row['range']) || 'Melee',
      burden: parseBurden(row['burden']),
      ...dmg,
      feature,
    };
    const mods = feature ? parseModifiers(feature.text) : {};
    if (Object.keys(mods).length) item.modifiers = mods;
    return item;
  }

  if (section === 'armor') {
    const [major, severe] = norm(row['base thresholds'])
      .split('/')
      .map((n) => parseInt(n, 10) || 0);
    const feature = parseFeature(row['feature']);
    const item = {
      name,
      slug: slugify(name),
      category: 'armor',
      tier: rowTier || 1,
      baseMajor: major ?? 0,
      baseSevere: severe ?? 0,
      baseScore: parseInt(norm(row['base score']), 10) || 0,
      feature,
    };
    const mods = feature ? parseModifiers(feature.text) : {};
    if (Object.keys(mods).length) item.modifiers = mods;
    return item;
  }

  if (section === 'loot' || section === 'consumable') {
    const description = norm(row['effect']);
    const item = {
      name,
      slug: slugify(name),
      category: section === 'loot' ? 'utility' : 'consumable',
      tier: 1,
      description,
    };
    const mods = parseModifiers(description);
    if (Object.keys(mods).length) item.modifiers = mods;
    return item;
  }

  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const outPath = outIdx !== -1 ? args[outIdx + 1] : resolve(__dirname, 'seed-items.local.mjs');
  const srcPath = args.find((a, i) => !a.startsWith('--') && i !== (outIdx !== -1 ? outIdx + 1 : -1));
  if (!srcPath) {
    console.error('Usage: node cdk/scripts/items-from-srd.mjs <compendium.md> [--out file]');
    process.exit(1);
  }

  const md = readFileSync(resolve(srcPath), 'utf8');
  const items = parse(md);

  const counts = items.reduce((acc, i) => ((acc[i.category] = (acc[i.category] ?? 0) + 1), acc), {});
  console.log(`Parsed ${items.length} items:`, counts);

  const banner =
    '// AUTO-GENERATED from the Daggerheart SRD Items Compendium by items-from-srd.mjs.\n' +
    '// Gitignored — do not commit. Regenerate instead of hand-editing.\n\n';
  writeFileSync(outPath, banner + 'export const ITEMS = ' + JSON.stringify(items, null, 2) + ';\n');
  console.log(`Wrote ${outPath}`);
}

main();
