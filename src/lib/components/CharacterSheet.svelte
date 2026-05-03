<script>
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { featuresByName } from '$lib/stores/catalog.js';
  import FeatureEditor from './FeatureEditor.svelte';

  let {
    initial = null,
    campaign = null,
    ownerSub = null,
    isGmCreating = false,
    isGmEditing = false,
    campaignCode = null,
    backHref = '/characters',
  } = $props();

  // ── Identity ──────────────────────────────────────────────────────────────────
  let name       = $state(initial?.name ?? '');
  let playerName = $state(initial?.playerName ?? '');
  let charClass  = $state(initial?.class ?? '');
  let subclass   = $state(initial?.subclass ?? '');
  let level      = $state(initial?.level ?? 1);
  let ancestry   = $state(initial?.ancestry ?? '');
  let community  = $state(initial?.community ?? '');
  let pronouns   = $state(initial?.pronouns ?? '');

  // ── Traits ────────────────────────────────────────────────────────────────────
  let agility   = $state(initial?.agility   ?? 0);
  let strength  = $state(initial?.strength  ?? 0);
  let finesse   = $state(initial?.finesse   ?? 0);
  let instinct  = $state(initial?.instinct  ?? 0);
  let presence  = $state(initial?.presence  ?? 0);
  let knowledge = $state(initial?.knowledge ?? 0);

  // ── Resources ─────────────────────────────────────────────────────────────────
  let maxHP      = $state(initial?.maxHP      ?? 6);
  let hp         = $state(initial?.hp         ?? 0);
  let maxStress  = $state(initial?.maxStress  ?? 3);
  let stress     = $state(initial?.stress     ?? 0);
  let maxHope    = $state(initial?.maxHope    ?? 5);
  let hope       = $state(initial?.hope       ?? 5);
  let evasion    = $state(initial?.evasion    ?? 10);
  let armorSlots = $state(initial?.armorSlots ?? 0);
  let armorUsed  = $state(initial?.armorUsed  ?? 0);
  let handfuls   = $state(initial?.handfuls   ?? 0);
  let bags       = $state(initial?.bags       ?? 0);
  let chests     = $state(initial?.chests     ?? 0);

  // ── Content ───────────────────────────────────────────────────────────────────
  // Normalize experiences: support legacy string[] or new {text,modifier}[]
  function normalizeExp(raw) {
    return (raw ?? ['', '', '']).map(e =>
      typeof e === 'string' ? { text: e, modifier: 0 } : e
    );
  }
  let experiences = $state(normalizeExp(initial?.experiences));
  let features    = $state([...(initial?.features    ?? [])]);
  let items       = $state([...(initial?.items       ?? [])]);
  let notes       = $state(initial?.notes ?? '');
  let thresholds  = $state({
    minor:  initial?.thresholds?.minor  ?? 0,
    major:  initial?.thresholds?.major  ?? 0,
    severe: initial?.thresholds?.severe ?? 0,
  });

  // ── UI ────────────────────────────────────────────────────────────────────────
  let activeTab  = $state('identity');
  let charId     = $state(initial?.id ?? null);
  let saveStatus = $state('idle'); // idle | saving | saved | error
  let saveTimer;

  // ── Feature picker ────────────────────────────────────────────────────────────
  const FEAT_TYPES = ['Passive', 'Action', 'Reaction', 'Fear'];
  let pickerQuery       = $state('');
  let pickerType        = $state('');
  let createFeatureOpen = $state(false);

  let attachedNames = $derived(new Set(features.map(f => f.split('|')[0])));
  let pickerResults  = $derived.by(() => {
    const q = pickerQuery.trim().toLowerCase();
    return Object.entries($featuresByName)
      .filter(([n])     => !attachedNames.has(n))
      .filter(([, fd])  => !pickerType || (fd?.t ?? '') === pickerType)
      .filter(([n, fd]) => !q || n.toLowerCase().includes(q) || (fd?.t ?? '').toLowerCase().includes(q))
      .sort(([a], [b])  => a.localeCompare(b))
      .slice(0, 80);
  });

  function attachFeature(featName) { features = [...features, featName]; pickerQuery = ''; }
  function detachFeature(idx)      { features = features.filter((_, i) => i !== idx); }
  function setFeatNote(idx, note) {
    const [base] = features[idx].split('|');
    const next = [...features];
    next[idx] = note ? `${base}|${note}` : base;
    features = next;
  }
  function onFeatureCreated({ name: n }) {
    createFeatureOpen = false;
    if (n && !attachedNames.has(n)) features = [...features, n];
  }

  // ── Items ─────────────────────────────────────────────────────────────────────
  const ITEM_TYPES = ['weapon', 'armor', 'consumable', 'gear', 'tool', 'treasure'];
  const WEAPON_TRAITS = ['Agility', 'Strength', 'Finesse', 'Instinct', 'Presence', 'Knowledge'];
  const WEAPON_RANGES = ['Melee', 'Close', 'Far', 'Very Far'];

  let newItemName = $state('');
  let newItemType = $state('gear');

  function addItem() {
    if (!newItemName.trim()) return;
    items = [...items, {
      id: crypto.randomUUID(),
      name: newItemName.trim(),
      type: newItemType,
      quantity: 1,
      equipped: false,
      notes: '',
      trait: newItemType === 'weapon' ? 'Agility' : '',
      range: newItemType === 'weapon' ? 'Melee' : '',
      damage: '',
    }];
    newItemName = '';
  }
  function removeItem(id)              { items = items.filter(i => i.id !== id); }
  function updateItem(id, key, value)  { items = items.map(i => i.id === id ? { ...i, [key]: value } : i); }

  // ── Persist ───────────────────────────────────────────────────────────────────
  function payload() {
    return {
      name: name.trim(), playerName: playerName.trim(),
      class: charClass.trim(), subclass: subclass.trim(), level: +level || 1,
      ancestry: ancestry.trim(), community: community.trim(), pronouns: pronouns.trim(),
      agility: +agility, strength: +strength, finesse: +finesse,
      instinct: +instinct, presence: +presence, knowledge: +knowledge,
      maxHP: +maxHP, hp: +hp, maxStress: +maxStress, stress: +stress,
      maxHope: +maxHope, hope: +hope, evasion: +evasion,
      armorSlots: +armorSlots, armorUsed: +armorUsed,
      handfuls: +handfuls, bags: +bags, chests: +chests,
      experiences, features, items, notes, thresholds,
      ...(campaignCode ? { campaignCode, campaignGmSub: campaign?.gmSub } : {}),
    };
  }

  async function save() {
    clearTimeout(saveTimer);
    saveStatus = 'saving';
    try {
      let url, method;
      const code = campaign?.joinCode ?? campaignCode;
      function b64(str) {
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      }
      function b64Ref(sub, id) {
        return b64(sub + '|' + id);
      }
      if (isGmCreating) {
        url    = `/api/campaigns/${code}/characters`;
        method = 'POST';
      } else if (isGmEditing) {
        url    = `/api/campaigns/${code}/characters/${b64Ref(ownerSub, charId)}`;
        method = 'PUT';
      } else if (charId) {
        url    = `/api/characters/${b64(charId)}`;
        method = 'PUT';
      } else {
        url    = '/api/characters';
        method = 'POST';
      }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) });
      if (!res.ok) throw new Error(res.status);
      if (isGmCreating) { goto(backHref); return; }
      if (!charId) {
        const { id } = await res.json();
        charId = id;
        if (browser) {
          const encoded = btoa(id).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
          history.replaceState({}, '', `/characters/${encoded}`);
        }
      }
      saveStatus = 'saved';
      setTimeout(() => { if (saveStatus === 'saved') saveStatus = 'idle'; }, 2000);
    } catch {
      saveStatus = 'error';
      setTimeout(() => { if (saveStatus === 'error') saveStatus = 'idle'; }, 3000);
    }
  }

  function touch() {
    if (!charId && !isGmCreating && !isGmEditing) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1500);
  }

  function traitSign(v) { return v > 0 ? `+${v}` : `${v}`; }
</script>

<!-- ── Top bar ─────────────────────────────────────────────────────────────── -->
<div class="cs-wrap">
  <div class="cs-topbar">
    <a class="back-link" href={backHref}>← Back</a>
    <div class="cs-title-area">
      <input class="cs-name-input" type="text" placeholder="Character name…" bind:value={name} oninput={touch} />
      {#if pronouns}<span class="cs-pronouns">{pronouns}</span>{/if}
    </div>
    <div class="cs-save-area">
      {#if saveStatus === 'saving'}<span class="ss saving">Saving…</span>
      {:else if saveStatus === 'saved'}<span class="ss saved">Saved</span>
      {:else if saveStatus === 'error'}<span class="ss error">Error</span>{/if}
      <button class="btn-p" onclick={save}>{isGmCreating ? 'Create' : 'Save'}</button>
    </div>
  </div>

  <!-- ── Hero header ───────────────────────────────────────────────────────── -->
  <div class="cs-hero">
    <div class="hero-avatar">
      <div class="avatar-ph">{name?.[0]?.toUpperCase() ?? '?'}</div>
    </div>
    <div class="hero-identity">
      <div class="hero-class-row">
        {#if charClass}<span class="hero-badge">{charClass}{subclass ? ` · ${subclass}` : ''}</span>{/if}
        {#if level}<span class="hero-badge dim">Level {level}</span>{/if}
        {#if ancestry}<span class="hero-badge dim">{ancestry}{community ? ` · ${community}` : ''}</span>{/if}
      </div>
      {#if playerName}<div class="hero-player">Played by {playerName}</div>{/if}
    </div>
  </div>

  <!-- ── Body: two columns ─────────────────────────────────────────────────── -->
  <div class="cs-body">

    <!-- LEFT: traits + resources -->
    <aside class="cs-left">
      <div class="section-label">Traits</div>
      <div class="traits-grid">
        {#each [['Agility', agility], ['Strength', strength], ['Finesse', finesse], ['Instinct', instinct], ['Presence', presence], ['Knowledge', knowledge]] as [label, val] (label)}
          <div class="trait-card">
            <div class="trait-val">{traitSign(val)}</div>
            <div class="trait-name">{label}</div>
          </div>
        {/each}
      </div>

      <div class="section-label" style="margin-top:14px">Evasion</div>
      <div class="evasion-badge">{evasion}</div>

      <div class="section-label" style="margin-top:14px">Resources</div>
      <div class="resources-list">
        <!-- HP -->
        <div class="res-block">
          <div class="res-head">
            <span class="res-label">HP</span>
            <span class="res-fraction">{hp} / <input class="res-max-inp" type="number" min="1" bind:value={maxHP} oninput={touch} /></span>
          </div>
          <div class="dot-track">
            {#each Array.from({length: maxHP}, (_, i) => i) as i (i)}
              <button class="dot {i < hp ? 'filled' : ''}" onclick={() => { hp = i < hp ? i : i + 1; touch(); }}></button>
            {/each}
          </div>
        </div>
        <!-- Stress -->
        <div class="res-block">
          <div class="res-head">
            <span class="res-label">Stress</span>
            <span class="res-fraction">{stress} / <input class="res-max-inp" type="number" min="1" bind:value={maxStress} oninput={touch} /></span>
          </div>
          <div class="dot-track">
            {#each Array.from({length: maxStress}, (_, i) => i) as i (i)}
              <button class="dot stress-dot {i < stress ? 'filled' : ''}" onclick={() => { stress = i < stress ? i : i + 1; touch(); }}></button>
            {/each}
          </div>
        </div>
        <!-- Hope -->
        <div class="res-block">
          <div class="res-head">
            <span class="res-label hope-label">Hope</span>
            <span class="res-fraction">{hope} / <input class="res-max-inp" type="number" min="1" bind:value={maxHope} oninput={touch} /></span>
          </div>
          <div class="dot-track">
            {#each Array.from({length: maxHope}, (_, i) => i) as i (i)}
              <button class="dot hope-dot {i < hope ? 'filled' : ''}" onclick={() => { hope = i < hope ? i : i + 1; touch(); }}></button>
            {/each}
          </div>
        </div>
        <!-- Armor -->
        <div class="res-block">
          <div class="res-head">
            <span class="res-label">Armor</span>
            <span class="res-fraction">{armorUsed} / <input class="res-max-inp" type="number" min="0" bind:value={armorSlots} oninput={touch} /></span>
          </div>
          {#if armorSlots > 0}
          <div class="dot-track">
            {#each Array.from({length: armorSlots}, (_, i) => i) as i (i)}
              <button class="dot armor-dot {i < armorUsed ? 'filled' : ''}" onclick={() => { armorUsed = i < armorUsed ? i : i + 1; touch(); }}></button>
            {/each}
          </div>
          {/if}
        </div>
        <!-- Currency -->
        {#each [['Handfuls', handfuls, (v) => { handfuls = v; touch(); }], ['Bags', bags, (v) => { bags = v; touch(); }], ['Chests', chests, (v) => { chests = v; touch(); }]] as [label, val, set] (label)}
        <div class="res-block">
          <div class="res-head">
            <span class="res-label">{label}</span>
            <div class="gold-track">
              <button class="res-btn" onclick={() => set(Math.max(0, val - 1))}>−</button>
              <span class="gold-val">{val}</span>
              <button class="res-btn" onclick={() => set(val + 1)}>+</button>
            </div>
          </div>
        </div>
        {/each}

        <!-- Damage Thresholds -->
        <div class="section-label" style="margin-top:10px">Thresholds</div>
        <div class="threshold-grid">
          <div class="threshold-cell">
            <div class="threshold-lbl">Minor</div>
            <input class="threshold-inp" type="number" min="0" bind:value={thresholds.minor} oninput={touch} />
          </div>
          <div class="threshold-cell">
            <div class="threshold-lbl">Major</div>
            <input class="threshold-inp" type="number" min="0" bind:value={thresholds.major} oninput={touch} />
          </div>
          <div class="threshold-cell">
            <div class="threshold-lbl">Severe</div>
            <input class="threshold-inp" type="number" min="0" bind:value={thresholds.severe} oninput={touch} />
          </div>
        </div>
      </div>
    </aside>

    <!-- RIGHT: tabs -->
    <div class="cs-right">
      <div class="tab-strip">
        {#each [['identity','Identity'],['exp','Experiences'],['features','Features'],['equipment','Equipment'],['notes','Notes']] as [t, label] (t)}
          <button class="tab" class:active={activeTab === t} onclick={() => (activeTab = t)}>{label}</button>
        {/each}
      </div>

      <div class="tab-body">

        <!-- IDENTITY TAB -->
        {#if activeTab === 'identity'}
          <div class="form-grid">
            <div class="fg span2">
              <label>Character Name</label>
              <input type="text" bind:value={name} oninput={touch} placeholder="e.g. Sable Vex" />
            </div>
            <div class="fg">
              <label>Player Name</label>
              <input type="text" bind:value={playerName} oninput={touch} placeholder="Your name" />
            </div>
            <div class="fg">
              <label>Pronouns</label>
              <input type="text" bind:value={pronouns} oninput={touch} placeholder="they/them" />
            </div>
            <div class="fg">
              <label>Class</label>
              <input type="text" bind:value={charClass} oninput={touch} placeholder="e.g. Ranger" />
            </div>
            <div class="fg">
              <label>Subclass</label>
              <input type="text" bind:value={subclass} oninput={touch} placeholder="e.g. Beastbound" />
            </div>
            <div class="fg">
              <label>Level</label>
              <input type="number" min="1" max="10" bind:value={level} oninput={touch} />
            </div>
            <div class="fg">
              <label>Ancestry</label>
              <input type="text" bind:value={ancestry} oninput={touch} placeholder="e.g. Elf" />
            </div>
            <div class="fg">
              <label>Community</label>
              <input type="text" bind:value={community} oninput={touch} placeholder="e.g. Wanderer" />
            </div>
          </div>

          <div class="section-label" style="margin-top:18px">Traits</div>
          <div class="traits-edit-grid">
            {#each [['Agility', 'agility'], ['Strength', 'strength'], ['Finesse', 'finesse'], ['Instinct', 'instinct'], ['Presence', 'presence'], ['Knowledge', 'knowledge']] as [label, key] (key)}
              <div class="fg">
                <label>{label}</label>
                <input type="number" min="-5" max="5"
                  value={key === 'agility' ? agility : key === 'strength' ? strength : key === 'finesse' ? finesse : key === 'instinct' ? instinct : key === 'presence' ? presence : knowledge}
                  oninput={(e) => {
                    const v = +e.currentTarget.value;
                    if (key === 'agility')   agility   = v;
                    else if (key === 'strength')  strength  = v;
                    else if (key === 'finesse')   finesse   = v;
                    else if (key === 'instinct')  instinct  = v;
                    else if (key === 'presence')  presence  = v;
                    else                          knowledge = v;
                    touch();
                  }}
                />
              </div>
            {/each}
          </div>

          <div class="section-label" style="margin-top:18px">Combat Stats</div>
          <div class="form-grid">
            <div class="fg"><label>Evasion</label><input type="number" bind:value={evasion} oninput={touch} /></div>
            <div class="fg"><label>Max HP</label><input type="number" min="1" bind:value={maxHP} oninput={touch} /></div>
            <div class="fg"><label>Max Stress</label><input type="number" min="1" bind:value={maxStress} oninput={touch} /></div>
            <div class="fg"><label>Max Hope</label><input type="number" min="1" bind:value={maxHope} oninput={touch} /></div>
            <div class="fg"><label>Armor Slots</label><input type="number" min="0" bind:value={armorSlots} oninput={touch} /></div>
          </div>
        {/if}

        <!-- EXPERIENCES TAB -->
        {#if activeTab === 'exp'}
          <p class="tab-hint">Three short phrases describing what your character has experienced. Add a +modifier to roll when relevant.</p>
          <div class="exp-list">
            {#each experiences as _exp, i (i)}
              <div class="exp-row">
                <div class="exp-mod-wrap">
                  <label class="exp-mod-label">+</label>
                  <input class="exp-mod-inp" type="number" min="0" max="9"
                    bind:value={experiences[i].modifier}
                    oninput={() => { experiences = [...experiences]; touch(); }} />
                </div>
                <input class="exp-text-inp" type="text" placeholder="e.g. Grew up in the mines"
                  bind:value={experiences[i].text}
                  oninput={() => { experiences = [...experiences]; touch(); }} />
              </div>
            {/each}
          </div>
        {/if}

        <!-- FEATURES TAB -->
        {#if activeTab === 'features'}
          {#if features.length === 0}
            <div class="empty-feats">No features attached. Search below or create a new one.</div>
          {/if}
          <div class="attached-list">
            {#each features as feat, idx (idx + ':' + feat)}
              {@const [fname, fnote] = [feat.split('|')[0], feat.split('|')[1] ?? '']}
              {@const fd = $featuresByName[fname]}
              <div class="attached-row">
                <div class="attached-head">
                  <span class="ftype-mini t-{(fd?.t ?? 'feature').toLowerCase()}">{fd?.t ?? '?'}</span>
                  <span class="attached-name">{fname}</span>
                  <button class="detach-btn" onclick={() => { detachFeature(idx); touch(); }}>✕</button>
                </div>
                {#if fd?.tx}<div class="attached-tx">{fd.tx}</div>{/if}
                <input class="note-input" type="text" placeholder="Optional note…" value={fnote}
                  oninput={(e) => { setFeatNote(idx, e.currentTarget.value); touch(); }} />
              </div>
            {/each}
          </div>

          <hr class="divider-soft" />
          <div class="type-filters">
            <button class="type-filter-btn" class:active={pickerType === ''} onclick={() => (pickerType = '')}>All</button>
            {#each FEAT_TYPES as ft (ft)}
              <button class="type-filter-btn t-{ft.toLowerCase()}" class:active={pickerType === ft} onclick={() => (pickerType = ft)}>{ft}</button>
            {/each}
          </div>
          <input class="picker-search" type="text" placeholder="Search features…" bind:value={pickerQuery} />
          <div class="picker-results">
            {#each pickerResults as [n, fd] (n)}
              <button class="picker-row" onclick={() => { attachFeature(n); touch(); }}>
                <span class="ftype-mini t-{(fd?.t ?? 'feature').toLowerCase()}">{fd?.t ?? '?'}</span>
                <span class="picker-name">{n}</span>
                {#if fd?.custom}<span class="custom-pip">★</span>{/if}
              </button>
            {:else}
              <div class="picker-empty">{pickerQuery || pickerType ? 'No matches.' : 'Type to search…'}</div>
            {/each}
          </div>
          <button class="create-feature-btn" onclick={() => (createFeatureOpen = true)}>+ Create new feature</button>
        {/if}

        <!-- EQUIPMENT TAB -->
        {#if activeTab === 'equipment'}
          <div class="equip-section">
            <div class="section-label">Weapons</div>
            {#each items.filter(i => i.type === 'weapon') as item (item.id)}
              <div class="item-row weapon-row">
                <input class="item-name-inp" type="text" value={item.name}
                  oninput={(e) => { updateItem(item.id, 'name', e.currentTarget.value); touch(); }} />
                <select onchange={(e) => { updateItem(item.id, 'trait', e.currentTarget.value); touch(); }}>
                  {#each WEAPON_TRAITS as t (t)}<option selected={item.trait === t}>{t}</option>{/each}
                </select>
                <select onchange={(e) => { updateItem(item.id, 'range', e.currentTarget.value); touch(); }}>
                  {#each WEAPON_RANGES as r (r)}<option selected={item.range === r}>{r}</option>{/each}
                </select>
                <input class="damage-inp" type="text" placeholder="2d6+1" value={item.damage}
                  oninput={(e) => { updateItem(item.id, 'damage', e.currentTarget.value); touch(); }} />
                <button class="rm-btn" onclick={() => { removeItem(item.id); touch(); }}>✕</button>
              </div>
            {/each}

            <div class="section-label" style="margin-top:14px">Armor &amp; Other Items</div>
            {#each items.filter(i => i.type !== 'weapon') as item (item.id)}
              <div class="item-row">
                <span class="item-type-badge">{item.type}</span>
                <input class="item-name-inp" type="text" value={item.name}
                  oninput={(e) => { updateItem(item.id, 'name', e.currentTarget.value); touch(); }} />
                <input class="item-qty-inp" type="number" min="1" value={item.quantity}
                  oninput={(e) => { updateItem(item.id, 'quantity', +e.currentTarget.value); touch(); }} />
                <label class="item-equip">
                  <input type="checkbox" checked={item.equipped}
                    onchange={(e) => { updateItem(item.id, 'equipped', e.currentTarget.checked); touch(); }} />
                  Equipped
                </label>
                <button class="rm-btn" onclick={() => { removeItem(item.id); touch(); }}>✕</button>
              </div>
            {/each}

            <div class="add-item-row">
              <input class="item-name-inp" type="text" placeholder="Item name…" bind:value={newItemName}
                onkeydown={(e) => e.key === 'Enter' && addItem()} />
              <select bind:value={newItemType}>
                {#each ITEM_TYPES as t (t)}<option value={t}>{t}</option>{/each}
              </select>
              <button class="btn-c" onclick={() => { addItem(); touch(); }}>+ Add</button>
            </div>
          </div>
        {/if}

        <!-- NOTES TAB -->
        {#if activeTab === 'notes'}
          <textarea class="notes-area" placeholder="Background, session notes, reminders…"
            bind:value={notes} oninput={touch}></textarea>
        {/if}

      </div>
    </div>
  </div>
</div>

{#if createFeatureOpen}
  <div class="overlay show" role="dialog" aria-modal="true" tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && (createFeatureOpen = false)}
    onkeydown={(e) => e.key === 'Escape' && (createFeatureOpen = false)}>
    <div class="modal modal-md">
      <div class="modal-title">New Feature</div>
      <FeatureEditor afterSave={onFeatureCreated} afterCancel={() => (createFeatureOpen = false)} />
    </div>
  </div>
{/if}

<style>
  .cs-wrap { max-width: 1200px; margin: 0 auto; padding: 16px 20px 60px; display: flex; flex-direction: column; gap: 14px; }

  /* Top bar */
  .cs-topbar { display: flex; align-items: center; gap: 12px; }
  .back-link { color: var(--text-dim); text-decoration: none; font-size: 0.85rem; white-space: nowrap; }
  .back-link:hover { color: var(--text); }
  .cs-title-area { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; }
  .cs-name-input { flex: 1; background: transparent; border: none; border-bottom: 1px solid var(--border); color: var(--text); font-family: var(--font-head); font-size: 1.4rem; padding: 2px 0; outline: none; }
  .cs-name-input:focus { border-bottom-color: var(--accent); }
  .cs-pronouns { color: var(--text-dim); font-size: 0.8rem; white-space: nowrap; }
  .cs-save-area { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .ss { font-family: var(--font-mono); font-size: 0.72rem; }
  .ss.saving { color: var(--text-dim); }
  .ss.saved { color: #6ec38c; }
  .ss.error { color: var(--danger); }

  /* Hero */
  .cs-hero { display: flex; align-items: center; gap: 16px; padding: 14px 18px; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; }
  .hero-avatar { width: 56px; height: 56px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
  .avatar-ph { width: 100%; height: 100%; background: var(--surface3); border: 2px solid var(--border); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-head); font-size: 1.5rem; color: var(--text-dim); }
  .hero-identity { flex: 1; min-width: 0; }
  .hero-class-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
  .hero-badge { display: inline-block; font-size: 0.75rem; padding: 2px 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 3px; color: var(--text); }
  .hero-badge.dim { color: var(--text-dim); }
  .hero-player { font-size: 0.72rem; color: var(--text-faint); font-style: italic; }

  /* Body layout */
  .cs-body { display: grid; grid-template-columns: 220px 1fr; gap: 18px; align-items: start; }
  @media (max-width: 720px) { .cs-body { grid-template-columns: 1fr; } }

  /* Left panel */
  .cs-left { display: flex; flex-direction: column; gap: 6px; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 14px; }
  .section-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); font-weight: 600; margin-bottom: 4px; }

  /* Traits grid */
  .traits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .trait-card { background: var(--surface3); border: 1px solid var(--border); border-radius: 5px; padding: 8px 6px; text-align: center; }
  .trait-val { font-family: var(--font-head); font-size: 1.25rem; font-weight: 600; color: var(--text); line-height: 1; }
  .trait-name { font-family: var(--font-mono); font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); margin-top: 3px; }

  /* Evasion */
  .evasion-badge { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--border2); background: var(--surface3); font-family: var(--font-head); font-size: 1.2rem; color: var(--text); }

  /* Resources */
  .resources-list { display: flex; flex-direction: column; gap: 8px; }
  .res-block { display: flex; flex-direction: column; gap: 3px; }
  .res-head { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
  .res-label { font-family: var(--font-mono); font-size: 0.62rem; text-transform: uppercase; color: var(--text-dim); flex-shrink: 0; }
  .hope-label { color: var(--accent); }
  .res-fraction { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-dim); display: flex; align-items: center; gap: 2px; }
  .res-max-inp { width: 28px; background: transparent; border: none; border-bottom: 1px solid var(--border); color: var(--text-dim); font-family: var(--font-mono); font-size: 0.72rem; text-align: center; padding: 0; outline: none; }
  .res-max-inp:focus { border-bottom-color: var(--accent); }
  /* Dot track */
  .dot-track { display: flex; flex-wrap: wrap; gap: 3px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid var(--border2); background: transparent; cursor: pointer; padding: 0; transition: background 0.1s, border-color 0.1s; -webkit-tap-highlight-color: transparent; }
  .dot.filled { background: var(--hp-on, #d64040); border-color: var(--hp-on, #d64040); }
  .dot.stress-dot.filled { background: var(--stress-on, #d8a040); border-color: var(--stress-on, #d8a040); }
  .dot.hope-dot.filled { background: var(--accent); border-color: var(--accent); }
  .dot.armor-dot.filled { background: var(--text-dim); border-color: var(--text-dim); }
  .dot:hover { border-color: var(--accent); }
  /* Gold */
  .gold-track { display: flex; align-items: center; gap: 4px; }
  .gold-val { font-family: var(--font-mono); font-size: 0.82rem; font-weight: 600; min-width: 24px; text-align: center; }
  .res-btn { width: 20px; height: 20px; background: var(--surface3); border: 1px solid var(--border); border-radius: 3px; color: var(--text); cursor: pointer; font-size: 0.85rem; line-height: 1; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .res-btn:hover { border-color: var(--accent); color: var(--accent); }
  /* Thresholds */
  .threshold-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }
  .threshold-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; background: var(--surface3); border: 1px solid var(--border); border-radius: 4px; padding: 5px 4px; }
  .threshold-lbl { font-family: var(--font-mono); font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); }
  .threshold-inp { width: 36px; background: transparent; border: none; border-bottom: 1px solid var(--border); color: var(--text); font-family: var(--font-head); font-size: 1rem; font-weight: 600; text-align: center; padding: 0; outline: none; }
  .threshold-inp:focus { border-bottom-color: var(--accent); }

  /* Right panel */
  .cs-right { display: flex; flex-direction: column; gap: 0; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
  .tab-strip { display: flex; border-bottom: 1px solid var(--border); }
  .tab { background: transparent; border: none; color: var(--text-dim); padding: 9px 14px; font-size: 0.82rem; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: inherit; white-space: nowrap; }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--text); border-bottom-color: var(--accent); }
  .tab-body { padding: 18px; display: flex; flex-direction: column; gap: 12px; }

  /* Tab: identity */
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .span2 { grid-column: span 2; }
  .traits-edit-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .tab-hint { color: var(--text-dim); font-size: 0.82rem; margin: 0; line-height: 1.5; }

  /* Tab: experiences */
  .exp-list { display: flex; flex-direction: column; gap: 10px; }
  .exp-row { display: flex; align-items: center; gap: 8px; }
  .exp-mod-wrap { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
  .exp-mod-label { font-family: var(--font-mono); font-size: 0.9rem; color: var(--accent); font-weight: 700; }
  .exp-mod-inp { width: 36px; background: var(--surface); border: 1px solid var(--border); border-radius: 3px; color: var(--text); font-family: var(--font-mono); font-size: 0.9rem; font-weight: 600; text-align: center; padding: 3px 4px; outline: none; }
  .exp-mod-inp:focus { border-color: var(--accent); }
  .exp-text-inp { flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: 3px; color: var(--text); font-size: 0.88rem; padding: 5px 8px; outline: none; }
  .exp-text-inp:focus { border-color: var(--accent); }

  /* Tab: features */
  .empty-feats { color: var(--text-dim); font-style: italic; font-size: 0.8rem; }
  .attached-list { display: flex; flex-direction: column; gap: 8px; }
  .attached-row { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
  .attached-head { display: flex; align-items: center; gap: 6px; }
  .attached-name { flex: 1; font-weight: 600; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .attached-tx { font-size: 0.75rem; color: var(--text-dim); line-height: 1.35; }
  .detach-btn { background: none; border: none; color: var(--text-dim); cursor: pointer; padding: 0 4px; font-size: 0.85rem; opacity: 0.6; }
  .detach-btn:hover { color: var(--danger); opacity: 1; }
  .note-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); color: var(--text); font-size: 0.75rem; padding: 3px 7px; border-radius: 3px; font-family: var(--font-mono); }
  .divider-soft { border: none; border-top: 1px dashed var(--border); margin: 4px 0; }
  .type-filters { display: flex; gap: 4px; flex-wrap: wrap; }
  .type-filter-btn { background: var(--surface2); border: 1px solid var(--border); color: var(--text-dim); padding: 3px 10px; border-radius: 3px; font-size: 0.72rem; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; }
  .type-filter-btn.t-passive { color: var(--feat-passive, #6ec38c); }
  .type-filter-btn.t-action { color: var(--feat-action, #d8a040); }
  .type-filter-btn.t-reaction { color: var(--feat-reaction, #5aafdd); }
  .type-filter-btn.t-fear { color: var(--feat-fear, #d64040); }
  .type-filter-btn.active { background: color-mix(in srgb, currentColor 18%, var(--surface2)); border-color: currentColor; }
  .picker-search { width: 100%; background: var(--surface2); border: 1px solid var(--border); color: var(--text); padding: 6px 10px; border-radius: 3px; font-size: 0.85rem; }
  .picker-results { display: flex; flex-direction: column; gap: 2px; max-height: 220px; overflow-y: auto; }
  .picker-row { display: flex; align-items: center; gap: 7px; padding: 5px 7px; background: transparent; border: 1px solid transparent; border-radius: 3px; cursor: pointer; text-align: left; color: var(--text); font-size: 0.82rem; }
  .picker-row:hover { background: var(--surface); border-color: var(--border); }
  .picker-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .picker-empty { color: var(--text-dim); font-style: italic; font-size: 0.78rem; padding: 8px 4px; }
  .custom-pip { color: var(--accent); font-size: 0.75rem; }
  .create-feature-btn { background: transparent; border: 1px dashed var(--border); color: var(--accent); padding: 7px; border-radius: 3px; cursor: pointer; font-size: 0.82rem; margin-top: 2px; }
  .create-feature-btn:hover { background: color-mix(in srgb, var(--accent) 10%, transparent); border-color: var(--accent); }

  /* Feature type mini badges (shared with AdversaryEditor) */
  .ftype-mini { display: inline-block; font-family: var(--font-mono); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 6px; border-radius: 3px; background: var(--surface); color: var(--text-dim); border: 1px solid var(--border); flex-shrink: 0; }
  .ftype-mini.t-passive  { color: var(--feat-passive,  #6ec38c); border-color: currentColor; }
  .ftype-mini.t-action   { color: var(--feat-action,   #d8a040); border-color: currentColor; }
  .ftype-mini.t-reaction { color: var(--feat-reaction, #5aafdd); border-color: currentColor; }
  .ftype-mini.t-fear     { color: var(--feat-fear,     #d64040); border-color: currentColor; }

  /* Tab: equipment */
  .equip-section { display: flex; flex-direction: column; gap: 6px; }
  .item-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 6px 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; }
  .weapon-row { background: color-mix(in srgb, var(--accent) 5%, var(--surface)); }
  .item-name-inp { flex: 1; min-width: 100px; background: transparent; border: none; border-bottom: 1px solid var(--border); color: var(--text); font-size: 0.85rem; padding: 2px 0; outline: none; }
  .item-name-inp:focus { border-bottom-color: var(--accent); }
  .damage-inp { width: 70px; background: transparent; border: none; border-bottom: 1px solid var(--border); color: var(--text); font-size: 0.82rem; padding: 2px 0; outline: none; font-family: var(--font-mono); }
  .item-qty-inp { width: 40px; background: transparent; border: none; border-bottom: 1px solid var(--border); color: var(--text); font-size: 0.82rem; text-align: center; padding: 2px 0; outline: none; }
  .item-type-badge { font-family: var(--font-mono); font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); background: var(--surface2); border: 1px solid var(--border); border-radius: 3px; padding: 2px 6px; flex-shrink: 0; }
  .item-equip { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: var(--text-dim); cursor: pointer; }
  .rm-btn { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 0.85rem; padding: 0 4px; opacity: 0.5; flex-shrink: 0; }
  .rm-btn:hover { color: var(--danger); opacity: 1; }
  .add-item-row { display: flex; align-items: center; gap: 6px; margin-top: 6px; padding-top: 10px; border-top: 1px dashed var(--border); }

  /* Tab: notes */
  .notes-area { width: 100%; min-height: 220px; background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 10px; border-radius: 4px; font-family: var(--font-body); font-size: 0.88rem; resize: vertical; line-height: 1.6; }
  .notes-area:focus { outline: none; border-color: var(--accent); }

  .modal-md { width: 560px; max-width: 96vw; }
</style>
