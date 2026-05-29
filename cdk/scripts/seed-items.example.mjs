// Sample inventory catalogue data + the canonical item schema reference.
//
// This committed file documents the shape `seed-items.mjs` expects and seeds a
// small, generic starter catalogue so the inventory feature is usable in a
// fresh environment. To load the full Daggerheart SRD weapon/armor/consumable
// tables, create `seed-items.local.mjs` (gitignored, same pattern as
// `seed-data.local.mjs`) exporting an `ITEMS` array in this format — the seeder
// prefers the local file when present.
//
// ── Item schema ──────────────────────────────────────────────────────────────
// Common fields (all categories):
//   name        string   (required) display name; slug is derived from it
//   category    string   'weapon' | 'armor' | 'consumable' | 'utility'
//   tier        number   SRD tier (1–4); used for sorting + starter picks
//   description string   flavour / rules text
//   feature     object?  { name, text } special feature, or null
//   modifiers   object?  flat bonuses applied while EQUIPPED, any of:
//                        evasion, armorScore, thresholdMajor, thresholdSevere,
//                        hp, stress, hope, agility, strength, finesse,
//                        instinct, presence, knowledge
//
// Weapon-only fields:
//   weaponClass 'primary' | 'secondary'
//   trait       'Agility' | 'Strength' | 'Finesse' | 'Instinct' | 'Presence' | 'Knowledge'
//   range       'Melee' | 'Very Close' | 'Close' | 'Far' | 'Very Far'
//   burden      1 (one-handed) | 2 (two-handed; occupies both weapon slots)
//   damageDice  string   e.g. 'd8' (the per-proficiency die)
//   damageBonus number   flat bonus added to damage
//   damageType  'phy' | 'mag'
//
// Armor-only fields:
//   baseScore   number   armor score (= armor slots)
//   baseMajor   number   base Major damage threshold (level is added on top)
//   baseSevere  number   base Severe damage threshold (level is added on top)

export const ITEMS = [
  {
    name: 'Training Blade',
    category: 'weapon',
    tier: 1,
    weaponClass: 'primary',
    trait: 'Agility',
    range: 'Melee',
    burden: 1,
    damageDice: 'd6',
    damageBonus: 0,
    damageType: 'phy',
    description: 'A balanced practice sword. Reliable, if unremarkable.',
  },
  {
    name: 'Hunting Bow',
    category: 'weapon',
    tier: 1,
    weaponClass: 'primary',
    trait: 'Finesse',
    range: 'Far',
    burden: 2,
    damageDice: 'd6',
    damageBonus: 1,
    damageType: 'phy',
    description: 'A simple longbow suited to ranged hunters.',
  },
  {
    name: 'Buckler',
    category: 'weapon',
    tier: 1,
    weaponClass: 'secondary',
    trait: 'Strength',
    range: 'Melee',
    burden: 1,
    damageDice: 'd4',
    damageBonus: 0,
    damageType: 'phy',
    modifiers: { evasion: 1 },
    feature: { name: 'Brace', text: 'While equipped, gain +1 to Evasion.' },
    description: 'A small off-hand shield.',
  },
  {
    name: 'Gambeson',
    category: 'armor',
    tier: 1,
    baseScore: 3,
    baseMajor: 5,
    baseSevere: 11,
    description: 'Padded cloth armor. Light and flexible.',
  },
  {
    name: 'Chainmail',
    category: 'armor',
    tier: 1,
    baseScore: 4,
    baseMajor: 7,
    baseSevere: 15,
    modifiers: { evasion: -1 },
    feature: { name: 'Heavy', text: 'Reduce your Evasion by 1 while equipped.' },
    description: 'Interlocking metal rings offering solid protection.',
  },
  {
    name: 'Minor Health Potion',
    category: 'consumable',
    tier: 1,
    description: 'Drink to clear 1d4 HP. Consumed on use.',
  },
  {
    name: 'Stamina Potion',
    category: 'consumable',
    tier: 1,
    description: 'Drink to clear 1d4 Stress. Consumed on use.',
  },
  {
    name: 'Torch',
    category: 'utility',
    tier: 1,
    description: 'Lights the way in dark places for several hours.',
  },
  {
    name: 'Rope (50ft)',
    category: 'utility',
    tier: 1,
    description: 'Sturdy hemp rope, useful for climbing and binding.',
  },
  {
    name: 'Charm of Focus',
    category: 'utility',
    tier: 1,
    modifiers: { hope: 1 },
    feature: { name: 'Centering', text: 'While carried and attuned (equipped), raise your max Hope by 1.' },
    description: 'A small trinket that steadies the mind.',
  },
];
