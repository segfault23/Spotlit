import { writable } from 'svelte/store';

const DEFAULT_CREATURE = {
  isPC: false, name: '', type: 'Standard', tier: 1, diff: 11,
  maxHP: 6, hp: 0, maxStr: 3, str: 0, atk: '+1',
  thresh: '', dmg: '', atkName: '', feats: [],
  spotlit: false,
  conds: { hidden: false, restrained: false, vulnerable: false },
  notes: ''
};

function createEncounterStore() {
  const { subscribe, update } = writable({
    fear: 0, round: 1, uid: 1,
    encounterName: '',
    creatures: [],
    expandedFeats: [],
  });

  return {
    subscribe,

    adj(key, delta) {
      let roundAdvanced = false;
      update(s => {
        if (key === 'fear') {
          return { ...s, fear: Math.max(0, Math.min(12, s.fear + delta)) };
        }
        if (key === 'round') {
          const newRound = Math.max(1, s.round + delta);
          if (newRound > s.round) {
            roundAdvanced = true;
            return {
              ...s, round: newRound, expandedFeats: [],
              creatures: s.creatures.map(c => ({ ...c, spotlit: false }))
            };
          }
          return { ...s, round: newRound };
        }
        return s;
      });
      return roundAdvanced;
    },

    toggleDot(id, key, i) {
      update(s => ({
        ...s,
        creatures: s.creatures.map(c => {
          if (c.id !== id) return c;
          if (key === 'hp')  return { ...c, hp:      c.hp      > i ? i : i + 1 };
          if (key === 'str') return { ...c, str:     c.str     > i ? i : i + 1 };
          if (key === 'arm') return { ...c, armUsed: (c.armUsed || 0) > i ? i : i + 1 };
          return c;
        })
      }));
    },

    toggleCond(id, k) {
      update(s => ({
        ...s,
        creatures: s.creatures.map(c =>
          c.id === id ? { ...c, conds: { ...c.conds, [k]: !c.conds[k] } } : c
        )
      }));
    },

    toggleSpot(id) {
      update(s => ({
        ...s,
        creatures: s.creatures.map(c =>
          c.id === id ? { ...c, spotlit: !c.spotlit } : c
        )
      }));
    },

    toggleFeats(id) {
      update(s => {
        const expanded = s.expandedFeats.includes(id);
        return {
          ...s,
          expandedFeats: expanded
            ? s.expandedFeats.filter(x => x !== id)
            : [...s.expandedFeats, id]
        };
      });
    },

    quickHP(id, delta) {
      update(s => ({
        ...s,
        creatures: s.creatures.map(c =>
          c.id === id ? { ...c, hp: Math.max(0, Math.min(c.maxHP, c.hp + delta)) } : c
        )
      }));
    },

    removeCreature(id) {
      update(s => ({
        ...s,
        creatures: s.creatures.filter(c => c.id !== id),
        expandedFeats: s.expandedFeats.filter(x => x !== id)
      }));
    },

    setNotes(id, value) {
      update(s => ({
        ...s,
        creatures: s.creatures.map(c =>
          c.id === id ? { ...c, notes: value } : c
        )
      }));
    },

    addCreature(overrides = {}) {
      update(s => ({
        ...s,
        uid: s.uid + 1,
        creatures: [...s.creatures, { ...DEFAULT_CREATURE, ...overrides, id: s.uid }]
      }));
    },

    setEncounterName(name) {
      update(s => ({ ...s, encounterName: name }));
    },

    reset() {
      update(s => ({
        ...s,
        fear: 0, round: 1, expandedFeats: [],
        creatures: s.creatures.map(c => ({
          ...c, hp: 0, str: 0, armUsed: 0, spotlit: false,
          conds: { hidden: false, restrained: false, vulnerable: false },
          notes: ''
        }))
      }));
    },

    new() {
      update(s => ({
        ...s,
        fear: 0, round: 1, uid: 1, encounterName: '',
        creatures: [], expandedFeats: []
      }));
    }
  };
}

export const encounter = createEncounterStore();
