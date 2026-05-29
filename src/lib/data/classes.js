// Static metadata for the nine Daggerheart core classes.
//
// Subclass/domain data lives in DynamoDB, but the class itself carries no
// description or trait guidance there — so the creation wizard reads this map
// for the short blurb shown on each class tile and for the order it pours the
// suggested trait array into (highest value → the class's most important trait).
//
// Keyed by lower-cased class name so lookups are robust to however the seed
// data capitalises `class`. `traitPriority` lists the six traits from most to
// least important; `applySuggested` assigns +2, +1, +1, 0, 0, −1 down that list.

export const CLASS_INFO = {
  bard: {
    description:
      'Charismatic performers who inspire allies and bend social encounters with words and song.',
    traitPriority: ['presence', 'knowledge', 'agility', 'finesse', 'instinct', 'strength'],
  },
  druid: {
    description:
      'Shapeshifting guardians of the wild who channel primal magic and take beastform.',
    traitPriority: ['instinct', 'strength', 'agility', 'knowledge', 'presence', 'finesse'],
  },
  guardian: {
    description:
      'Stalwart protectors who stand between their allies and harm, soaking up punishment.',
    traitPriority: ['strength', 'presence', 'agility', 'instinct', 'finesse', 'knowledge'],
  },
  ranger: {
    description:
      'Skilled hunters and trackers who strike from a distance and bond with an animal companion.',
    traitPriority: ['agility', 'instinct', 'finesse', 'strength', 'knowledge', 'presence'],
  },
  rogue: {
    description:
      'Stealthy tricksters who slip through the shadows and land precise, devastating strikes.',
    traitPriority: ['finesse', 'agility', 'instinct', 'presence', 'knowledge', 'strength'],
  },
  seraph: {
    description:
      'Divine warriors blessed with celestial power, blending martial might with healing prayer.',
    traitPriority: ['strength', 'presence', 'agility', 'instinct', 'knowledge', 'finesse'],
  },
  sorcerer: {
    description:
      'Wielders of raw, innate magic that surges from within rather than from study.',
    traitPriority: ['instinct', 'agility', 'knowledge', 'presence', 'finesse', 'strength'],
  },
  warrior: {
    description:
      'Masters of weapons and battlefield tactics who excel at sustained, relentless combat.',
    traitPriority: ['agility', 'strength', 'instinct', 'finesse', 'knowledge', 'presence'],
  },
  wizard: {
    description:
      'Scholarly spellcasters who command arcane knowledge honed through years of study.',
    traitPriority: ['knowledge', 'instinct', 'agility', 'finesse', 'presence', 'strength'],
  },
};

// Trait order used when a class has no specific guidance (mirrors the old
// fixed behaviour: Agility highest, Knowledge lowest).
export const DEFAULT_TRAIT_PRIORITY = [
  'agility',
  'strength',
  'finesse',
  'instinct',
  'presence',
  'knowledge',
];

// The Daggerheart level-1 starting array, highest to lowest.
export const STANDARD_ARRAY = [2, 1, 1, 0, 0, -1];

export function classInfo(name) {
  return CLASS_INFO[name?.toLowerCase()] ?? null;
}
