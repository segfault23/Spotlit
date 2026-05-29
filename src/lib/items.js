// Shared, client-safe inventory logic for player characters.
//
// The item *catalogue* (pre-made SRD items + a user's custom items) lives in
// DynamoDB and is fetched via `/api/items`. A character carries a self-contained
// snapshot of each item it owns in `character.items[]` — mirroring how domain
// cards are stored as full objects — so rendering and stat derivation never need
// to re-join against the catalogue.
//
// "Auto-apply" works by *derivation*: equipped gear is folded into a character's
// effective stats at display time (see `deriveStats`). Stored `evasion`,
// `armorSlots`, and `thresholds` remain the manual base; gear adds on top.

export const ITEM_CATEGORIES = ['weapon', 'armor', 'consumable', 'utility'];

export const CATEGORY_LABELS = {
  weapon: 'Weapon',
  armor: 'Armor',
  consumable: 'Consumable',
  utility: 'Utility',
};

export const TRAIT_KEYS = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'];
export const WEAPON_TRAITS = ['Agility', 'Strength', 'Finesse', 'Instinct', 'Presence', 'Knowledge'];
export const WEAPON_RANGES = ['Melee', 'Very Close', 'Close', 'Far', 'Very Far'];
export const WEAPON_CLASSES = ['primary', 'secondary'];
export const DAMAGE_TYPES = ['phy', 'mag'];

// Legacy `type` values from the original free-text equipment tab → category.
const LEGACY_TYPE_TO_CATEGORY = {
  weapon: 'weapon',
  armor: 'armor',
  consumable: 'consumable',
  gear: 'utility',
  tool: 'utility',
  treasure: 'utility',
};

export function slugify(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[‘’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function emptyModifiers() {
  return {
    evasion: 0,
    armorScore: 0,
    thresholdMajor: 0,
    thresholdSevere: 0,
    hp: 0,
    stress: 0,
    hope: 0,
    agility: 0,
    strength: 0,
    finesse: 0,
    instinct: 0,
    presence: 0,
    knowledge: 0,
  };
}

function normalizeModifiers(raw) {
  const base = emptyModifiers();
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(base)) {
      const n = Number(raw[key]);
      if (Number.isFinite(n)) base[key] = n;
    }
  }
  return base;
}

// Returns true when any modifier is non-zero (used to decide whether to render
// the "modifiers" chip on an inventory row).
export function hasModifiers(mods) {
  if (!mods) return false;
  return Object.values(mods).some((v) => Number(v) !== 0);
}

// Coerce any stored/catalogue item into the canonical inventory shape. Tolerant
// of legacy records (old `type`, free-text `damage`) and partial catalogue rows.
export function normalizeItem(raw = {}) {
  const category =
    ITEM_CATEGORIES.includes(raw.category)
      ? raw.category
      : LEGACY_TYPE_TO_CATEGORY[raw.type] ?? 'utility';

  const item = {
    id: raw.id ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item-${Math.random().toString(36).slice(2, 10)}`),
    slug: raw.slug ?? null,
    name: raw.name ?? '',
    category,
    tier: Number(raw.tier) || 1,
    quantity: Number(raw.quantity) > 0 ? Number(raw.quantity) : 1,
    equipped: !!raw.equipped,
    description: raw.description ?? '',
    notes: raw.notes ?? '',
    feature: raw.feature && raw.feature.name ? { name: raw.feature.name, text: raw.feature.text ?? '' } : null,
    modifiers: normalizeModifiers(raw.modifiers),
    custom: !!raw.custom,
  };

  if (category === 'weapon') {
    item.weaponClass = WEAPON_CLASSES.includes(raw.weaponClass) ? raw.weaponClass : 'primary';
    item.trait = raw.trait || 'Agility';
    item.range = raw.range || 'Melee';
    item.burden = Number(raw.burden) === 2 ? 2 : 1;
    item.damageDice = raw.damageDice || 'd6';
    item.damageBonus = Number(raw.damageBonus) || 0;
    item.damageType = DAMAGE_TYPES.includes(raw.damageType) ? raw.damageType : 'phy';
  } else if (category === 'armor') {
    item.baseScore = Number(raw.baseScore) || 0;
    item.baseMajor = Number(raw.baseMajor) || 0;
    item.baseSevere = Number(raw.baseSevere) || 0;
  }

  return item;
}

export function normalizeInventory(items) {
  return (items ?? []).map(normalizeItem);
}

// Build a fresh inventory instance from a catalogue row.
export function inventoryItemFromCatalog(catalogItem) {
  const item = normalizeItem({ ...catalogItem, id: undefined, equipped: false, quantity: 1 });
  item.slug = catalogItem.slug ?? slugify(catalogItem.name);
  return item;
}

export function blankInventoryItem(category = 'utility', name = '') {
  return normalizeItem({ category, name });
}

export function isEquippable(item) {
  return item?.category === 'weapon' || item?.category === 'armor' || item?.category === 'utility';
}

// Daggerheart proficiency by level (number of weapon damage dice rolled).
// L1 → 1, then +1 at the tier breakpoints (levels 2, 5, 8).
export function proficiencyForLevel(level) {
  const l = Number(level) || 1;
  if (l >= 8) return 4;
  if (l >= 5) return 3;
  if (l >= 2) return 2;
  return 1;
}

export function formatWeaponDamage(weapon, level = 1) {
  if (!weapon) return '';
  const prof = proficiencyForLevel(level);
  const bonus = weapon.damageBonus ? `+${weapon.damageBonus}` : '';
  const type = weapon.damageType ? ` ${weapon.damageType}` : '';
  return `${prof}${weapon.damageDice}${bonus}${type}`;
}

// Enforce equip rules and return a new items array:
//  • at most one armor equipped,
//  • one primary + one secondary weapon,
//  • a two-handed (burden 2) primary occupies both weapon slots,
//  • utility items may be freely toggled.
export function setEquipped(items, id, equipped) {
  const list = normalizeInventory(items);
  const target = list.find((i) => i.id === id);
  if (!target) return list;

  if (!equipped) {
    return list.map((i) => (i.id === id ? { ...i, equipped: false } : i));
  }
  if (!isEquippable(target)) return list;

  return list.map((i) => {
    if (i.id === id) return { ...i, equipped: true };

    if (target.category === 'armor' && i.category === 'armor') {
      return { ...i, equipped: false };
    }
    if (target.category === 'weapon' && i.category === 'weapon' && i.equipped) {
      // Two-handed primary clears all other weapons; otherwise only clear the
      // same slot (and any two-handed weapon, which would conflict).
      if (target.burden === 2 || i.weaponClass === target.weaponClass || i.burden === 2) {
        return { ...i, equipped: false };
      }
    }
    return i;
  });
}

export function equippedItems(items) {
  return normalizeInventory(items).filter((i) => i.equipped);
}

// Fold base stats + equipped gear into the character's effective stats.
// `char` is any object carrying the base fields and an `items` array.
export function deriveStats(char = {}) {
  const level = Number(char.level) || 1;
  const items = normalizeInventory(char.items);
  const equipped = items.filter((i) => i.equipped);

  const activeArmor = equipped.find((i) => i.category === 'armor') ?? null;
  const weapons = equipped.filter((i) => i.category === 'weapon');
  const primaryWeapon = weapons.find((w) => w.weaponClass === 'primary') ?? null;
  const secondaryWeapon = weapons.find((w) => w.weaponClass === 'secondary') ?? null;

  // Sum flat modifiers across everything equipped.
  const mods = emptyModifiers();
  for (const it of equipped) {
    for (const key of Object.keys(mods)) mods[key] += it.modifiers?.[key] ?? 0;
  }

  const baseEvasion = Number(char.evasion) || 0;
  const baseArmorSlots = Number(char.armorSlots) || 0;
  const baseThresholds = char.thresholds ?? {};

  const armorScore = (activeArmor ? activeArmor.baseScore : baseArmorSlots) + mods.armorScore;

  const thresholds = activeArmor
    ? {
        minor: Number(baseThresholds.minor) || 0,
        major: activeArmor.baseMajor + level + mods.thresholdMajor,
        severe: activeArmor.baseSevere + level + mods.thresholdSevere,
      }
    : {
        minor: Number(baseThresholds.minor) || 0,
        major: (Number(baseThresholds.major) || 0) + mods.thresholdMajor,
        severe: (Number(baseThresholds.severe) || 0) + mods.thresholdSevere,
      };

  const traits = {};
  for (const t of TRAIT_KEYS) traits[t] = (Number(char[t]) || 0) + mods[t];

  const attacks = weapons.map((w) => ({
    id: w.id,
    name: w.name,
    weaponClass: w.weaponClass,
    trait: w.trait,
    traitMod: traits[w.trait?.toLowerCase()] ?? 0,
    range: w.range,
    damage: formatWeaponDamage(w, level),
    feature: w.feature,
  }));

  return {
    evasion: baseEvasion + mods.evasion,
    armorScore: Math.max(0, armorScore),
    thresholds,
    traits,
    maxHP: (Number(char.maxHP) || 0) + mods.hp,
    maxStress: (Number(char.maxStress) || 0) + mods.stress,
    maxHope: (Number(char.maxHope) || 0) + mods.hope,
    attacks,
    activeArmor,
    primaryWeapon,
    secondaryWeapon,
    modifiers: mods,
    hasGear: equipped.length > 0,
  };
}

// Suggest a starter loadout from the available catalogue for a given class.
// Picks the lowest-tier primary weapon that matches the class's key trait,
// a basic armor, and a couple of generic starter items. Returns inventory
// instances (not yet added). Falls back gracefully when the catalogue is thin.
export function recommendStarter(catalog, { traitPriority = [] } = {}) {
  const list = (catalog ?? []).map(normalizeItem);
  const keyTrait = (traitPriority[0] ?? 'agility').toLowerCase();
  const byTier = (a, b) => (a.tier || 99) - (b.tier || 99);

  const picks = [];

  const weapons = list.filter((i) => i.category === 'weapon').sort(byTier);
  const primary =
    weapons.find((w) => w.weaponClass === 'primary' && w.trait?.toLowerCase() === keyTrait) ??
    weapons.find((w) => w.weaponClass === 'primary') ??
    weapons[0];
  if (primary) picks.push({ ...inventoryItemFromCatalog(primary), equipped: true });

  const armor = list.filter((i) => i.category === 'armor').sort(byTier)[0];
  if (armor) picks.push({ ...inventoryItemFromCatalog(armor), equipped: true });

  const utility = list.filter((i) => i.category === 'utility').sort(byTier).slice(0, 2);
  for (const u of utility) picks.push(inventoryItemFromCatalog(u));

  const consumable = list.filter((i) => i.category === 'consumable').sort(byTier)[0];
  if (consumable) picks.push(inventoryItemFromCatalog(consumable));

  return picks;
}
