import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

const DEFAULT_CREATURE = {
  isPC: false, name: '', type: 'Standard', tier: 1, diff: 11,
  maxHP: 6, hp: 0, maxStr: 3, str: 0, atk: '+1',
  thresh: '', dmg: '', atkName: '', feats: [],
  spotlit: false,
  conds: { hidden: false, restrained: false, vulnerable: false },
  notes: ''
};

// 'idle' | 'saving' | 'saved' | 'error'
export const saveStatus = writable('idle');

// Snapshot of the encounter contents (excluding currentEncounterId).
// Used to skip redundant autosaves after load() / a no-op update.
function snapKey(s) {
  return JSON.stringify({
    f: s.fear, r: s.round, u: s.uid,
    n: s.encounterName,
    c: s.creatures,
    e: s.expandedFeats,
  });
}

async function persist(state, currentEncounterId) {
  const method = currentEncounterId ? 'PUT' : 'POST';
  const path   = currentEncounterId
    ? `/api/encounters/${encodeURIComponent(currentEncounterId)}`
    : '/api/encounters';

  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });

  if (!res.ok) throw new Error(`Save failed: ${res.status}`);

  if (!currentEncounterId) {
    const { id } = await res.json();
    return id;
  }
  return currentEncounterId;
}

function createEncounterStore() {
  const store = writable({
    fear: 0, round: 1, uid: 1,
    encounterName: '',
    creatures: [],
    expandedFeats: [],
    currentEncounterId: null,
  });

  const { subscribe, update } = store;

  // ── Autosave ─────────────────────────────────────────────────────────────
  let autosaveEnabled = false;
  let autosaveTimer   = null;
  let inflight        = null;
  let lastSavedKey    = '';

  function flashStatus(state, ms = 1500) {
    saveStatus.set(state);
    setTimeout(() => {
      saveStatus.update(cur => cur === state ? 'idle' : cur);
    }, ms);
  }

  async function doSave() {
    const full = get(store);
    const { currentEncounterId, ...state } = full;
    saveStatus.set('saving');
    try {
      const newId = await persist(state, currentEncounterId);
      if (!currentEncounterId) update(s => ({ ...s, currentEncounterId: newId }));
      lastSavedKey = snapKey(get(store));
      flashStatus('saved');
    } catch (e) {
      console.error('Autosave failed', e);
      flashStatus('error', 3000);
      throw e;
    }
  }

  function scheduleAutosave() {
    if (!autosaveEnabled) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(async () => {
      const cur = get(store);
      // Don't save an empty, never-saved encounter
      const hasContent = cur.creatures.length > 0 || cur.encounterName?.trim().length > 0;
      if (!hasContent && !cur.currentEncounterId) return;

      // Skip if nothing changed since last save
      if (snapKey(cur) === lastSavedKey) return;

      // Serialize: wait for any in-flight save before starting another
      if (inflight) {
        try { await inflight; } catch {}
      }
      inflight = doSave().finally(() => { inflight = null; });
      try { await inflight; } catch {}

      // If state changed during save, schedule another pass
      if (snapKey(get(store)) !== lastSavedKey) scheduleAutosave();
    }, 1200);
  }

  if (browser) {
    store.subscribe(s => {
      if (!autosaveEnabled) return;
      if (snapKey(s) === lastSavedKey) return;
      scheduleAutosave();
    });
  }

  return {
    subscribe,

    enableAutosave() { autosaveEnabled = true; },
    disableAutosave() {
      autosaveEnabled = false;
      clearTimeout(autosaveTimer);
    },

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
          if (key === 'hp')  return { ...c, hp: c.hp > i ? i : i + 1 };
          if (key === 'str') {
            const newStr = c.str > i ? i : i + 1;
            return { ...c, str: newStr, conds: { ...c.conds, vulnerable: newStr >= c.maxStr } };
          }
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
      clearTimeout(autosaveTimer);
      update(s => ({
        ...s,
        fear: 0, round: 1, uid: 1, encounterName: '',
        creatures: [], expandedFeats: [],
        currentEncounterId: null,
      }));
      lastSavedKey = snapKey(get(store));
    },

    // Manual save (still exposed in case anything wants to force a save)
    async save() {
      clearTimeout(autosaveTimer);
      if (inflight) { try { await inflight; } catch {} }
      inflight = doSave().finally(() => { inflight = null; });
      return inflight;
    },

    async load(id) {
      clearTimeout(autosaveTimer);
      const res = await fetch(`/api/encounters/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`Load failed: ${res.status}`);
      const { state } = await res.json();
      update(() => ({ ...state, currentEncounterId: id }));
      lastSavedKey = snapKey(get(store));
    },
  };
}

export const encounter = createEncounterStore();
