<script>
  import { goto, invalidateAll } from '$app/navigation';
  import { featuresByName } from '$lib/stores/catalog.js';
  import FeatureEditor from './FeatureEditor.svelte';
  import FeatureBlock from './FeatureBlock.svelte';

  let { initial = null, slug = null } = $props();

  const TYPES      = ['Bruiser','Horde','Leader','Minion','Ranged','Skulk','Social','Solo','Standard','Support'];
  const ATK_RANGES = ['Melee', 'Very Close', 'Close', 'Far', 'Very Far'];
  const DMG_TYPES  = ['phy', 'mag'];

  let name   = $state(initial?.name ?? '');
  let type   = $state(initial?.type ?? 'Solo');
  let tier   = $state(initial?.tier ?? 3);
  let diff   = $state(initial?.diff ?? 17);
  let atk    = $state(initial?.atk ?? '+3');
  let maxHP  = $state(initial?.maxHP ?? initial?.hp ?? 10);
  let maxStr = $state(initial?.maxStr ?? initial?.str ?? 4);
  let thresh = $state(initial?.thresh ?? '');
  let feats  = $state([...(initial?.feats ?? [])]);

  // Split "Bone Crush · Melee" into name + range
  const _atkStr     = initial?.atkName ?? '';
  const _atkDotIdx  = _atkStr.lastIndexOf(' · ');
  const _atkRangeParsed = _atkDotIdx >= 0 ? _atkStr.slice(_atkDotIdx + 3) : '';
  let atkNameBase  = $state(_atkDotIdx >= 0 ? _atkStr.slice(0, _atkDotIdx) : _atkStr);
  let atkNameRange = $state(ATK_RANGES.includes(_atkRangeParsed) ? _atkRangeParsed : 'Melee');

  // Split "3d12+5 phy" into expression + type
  const _dmgStr   = initial?.dmg ?? '';
  const _dmgParts = _dmgStr.split(' ');
  const _dmgLast  = _dmgParts[_dmgParts.length - 1];
  let dmgBase = $state(DMG_TYPES.includes(_dmgLast) ? _dmgParts.slice(0, -1).join(' ') : _dmgStr);
  let dmgType = $state(DMG_TYPES.includes(_dmgLast) ? _dmgLast : 'phy');

  let saving = $state(false);
  let err    = $state('');

  let pickerQuery       = $state('');
  let createFeatureOpen = $state(false);

  let attachedNames = $derived(new Set(feats.map(f => f.split('|')[0])));
  let pickerResults = $derived.by(() => {
    const q = pickerQuery.trim().toLowerCase();
    return Object.entries($featuresByName)
      .filter(([n]) => !attachedNames.has(n))
      .filter(([n, fd]) => !q || n.toLowerCase().includes(q) || (fd?.t ?? '').toLowerCase().includes(q))
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 80);
  });

  function attachFeature(featName) {
    feats = [...feats, featName];
    pickerQuery = '';
  }
  function detachFeature(idx) {
    feats = feats.filter((_, i) => i !== idx);
  }
  function moveFeature(idx, delta) {
    const j = idx + delta;
    if (j < 0 || j >= feats.length) return;
    const next = [...feats];
    [next[idx], next[j]] = [next[j], next[idx]];
    feats = next;
  }
  function setNote(idx, note) {
    const [base] = feats[idx].split('|');
    const next = [...feats];
    next[idx] = note ? `${base}|${note}` : base;
    feats = next;
  }

  function computeAtkName() {
    return atkNameBase.trim() ? `${atkNameBase.trim()} · ${atkNameRange}` : '';
  }
  function computeDmg() {
    return dmgBase.trim() ? `${dmgBase.trim()} ${dmgType}` : '';
  }

  function onFeatureCreated({ name: newName }) {
    createFeatureOpen = false;
    if (newName && !attachedNames.has(newName)) feats = [...feats, newName];
  }

  function looksDirty() {
    if (!initial) return name.trim().length > 0;
    return (
      name   !== initial.name ||
      type   !== initial.type ||
      Number(tier)   !== Number(initial.tier) ||
      Number(diff)   !== Number(initial.diff) ||
      atk    !== initial.atk ||
      Number(maxHP)  !== Number(initial.maxHP ?? initial.hp) ||
      Number(maxStr) !== Number(initial.maxStr ?? initial.str) ||
      thresh !== (initial.thresh ?? '') ||
      computeDmg()     !== (initial.dmg     ?? '') ||
      computeAtkName() !== (initial.atkName ?? '') ||
      JSON.stringify(feats) !== JSON.stringify(initial.feats ?? [])
    );
  }

  async function save() {
    if (!name.trim()) { err = 'Name is required.'; return; }
    err = '';
    saving = true;
    try {
      const payload = {
        name: name.trim(),
        type,
        tier: Number(tier),
        diff: Number(diff) || 14,
        atk,
        maxHP: Number(maxHP) || 6,
        maxStr: Number(maxStr) || 0,
        thresh,
        dmg:     computeDmg(),
        atkName: computeAtkName(),
        feats,
      };
      const path   = slug ? `/api/creatures/${encodeURIComponent(slug)}` : '/api/creatures';
      const method = slug ? 'PUT' : 'POST';
      const res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      await invalidateAll();
      goto('/profile?tab=adversaries');
    } catch (e) {
      err = e.message;
    } finally {
      saving = false;
    }
  }

  async function del() {
    if (!slug) return;
    if (!confirm('Delete this adversary from your library? Encounters that already include it keep their copy.')) return;
    saving = true;
    await fetch(`/api/creatures/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    await invalidateAll();
    goto('/profile?tab=adversaries');
  }

  function cancel() {
    if (looksDirty() && !confirm('Discard changes?')) return;
    goto('/profile?tab=adversaries');
  }
</script>

<div class="adv-editor">
  <h1 class="ed-title">{slug ? 'Edit Adversary' : 'New Adversary'}</h1>

  <div class="ed-grid">
    <!-- Left: stats -->
    <div class="col">
      <div class="fg">
        <label for="ae-name">Name</label>
        <input id="ae-name" type="text" placeholder="e.g. Crypt Wraith" bind:value={name} />
      </div>

      <div class="fgrow">
        <div class="fg">
          <label for="ae-type">Type</label>
          <select id="ae-type" bind:value={type}>
            {#each TYPES as t}<option>{t}</option>{/each}
          </select>
        </div>
        <div class="fg">
          <label for="ae-tier">Tier</label>
          <select id="ae-tier" bind:value={tier}>
            <option value={1}>T1</option>
            <option value={2}>T2</option>
            <option value={3}>T3</option>
            <option value={4}>T4</option>
          </select>
        </div>
      </div>

      <div class="fgrow3">
        <div class="fg"><label for="ae-diff">Difficulty</label><input id="ae-diff" type="number" bind:value={diff} /></div>
        <div class="fg"><label for="ae-atk">ATK Mod</label><input id="ae-atk" type="text" bind:value={atk} /></div>
        <div class="fg"><label for="ae-hp">Max HP</label><input id="ae-hp" type="number" min="1" bind:value={maxHP} /></div>
      </div>

      <div class="fgrow">
        <div class="fg"><label for="ae-str">Max Stress</label><input id="ae-str" type="number" min="0" bind:value={maxStr} /></div>
        <div class="fg"><label for="ae-thresh">Thresholds (Major / Severe)</label><input id="ae-thresh" type="text" placeholder="20 / 32" bind:value={thresh} /></div>
      </div>

      <div class="fg">
        <label>Damage</label>
        <div class="split-row">
          <input type="text" placeholder="3d12+5" bind:value={dmgBase} />
          <select bind:value={dmgType}>
            {#each DMG_TYPES as t}<option>{t}</option>{/each}
          </select>
        </div>
      </div>

      <div class="fg">
        <label>Standard Attack</label>
        <div class="split-row">
          <input type="text" placeholder="Bone Crush" bind:value={atkNameBase} />
          <select bind:value={atkNameRange}>
            {#each ATK_RANGES as r}<option>{r}</option>{/each}
          </select>
        </div>
      </div>
    </div>

    <!-- Right: features -->
    <div class="col">
      <span class="lbl">Attached Features ({feats.length})</span>

      {#if feats.length === 0}
        <div class="empty-feats">No features attached. Search below or create a new one.</div>
      {/if}

      <div class="attached-list">
        {#each feats as feat, idx (idx + ':' + feat)}
          {@const [fname, fnote] = [feat.split('|')[0], feat.split('|')[1] ?? '']}
          {@const fd = $featuresByName[fname]}
          <div class="attached-row">
            <div class="attached-controls">
              <button class="ord-btn" onclick={() => moveFeature(idx, -1)} disabled={idx === 0} title="Move up">▲</button>
              <button class="ord-btn" onclick={() => moveFeature(idx, +1)} disabled={idx === feats.length - 1} title="Move down">▼</button>
            </div>
            <div class="attached-body">
              <div class="attached-head">
                <span class="ftype-mini t-{(fd?.t ?? 'feature').toLowerCase()}">{fd?.t ?? 'Unknown'}</span>
                <span class="attached-name">{fname}</span>
                {#if fd?.custom}<span class="custom-pip" title="Your custom feature">★</span>{/if}
                {#if !fd}<span class="missing-pip" title="No catalog entry — will show as 'no data' when rendered">⚠</span>{/if}
                <button class="detach-btn" onclick={() => detachFeature(idx)} title="Remove">✕</button>
              </div>
              {#if fd?.tx}
                <div class="attached-tx">{fd.tx}</div>
              {/if}
              <input
                class="note-input"
                type="text"
                placeholder="Optional note (e.g. recharges on 5–6)"
                value={fnote}
                oninput={e => setNote(idx, e.currentTarget.value)}
              />
            </div>
          </div>
        {/each}
      </div>

      <hr class="divider-soft" />

      <span class="lbl">Add Feature</span>
      <input
        class="picker-search"
        type="text"
        placeholder="Search feature catalog…"
        bind:value={pickerQuery}
      />
      <div class="picker-results">
        {#each pickerResults as [n, fd] (n)}
          <button class="picker-row" onclick={() => attachFeature(n)}>
            <span class="ftype-mini t-{(fd?.t ?? 'feature').toLowerCase()}">{fd?.t ?? '?'}</span>
            <span class="picker-name">{n}</span>
            {#if fd?.custom}<span class="custom-pip">★</span>{/if}
          </button>
        {:else}
          <div class="picker-empty">
            {pickerQuery ? 'No matches.' : 'Type to search, or create a new feature below.'}
          </div>
        {/each}
      </div>
      <button class="create-feature-btn" onclick={() => (createFeatureOpen = true)}>
        + Create new feature
      </button>
    </div>
  </div>

  {#if err}<div class="ed-err">{err}</div>{/if}

  <div class="ed-bar">
    <button class="btn-c" onclick={cancel}>Cancel</button>
    {#if slug}
      <button class="btn-c btn-danger" onclick={del}>Delete</button>
    {/if}
    <button class="btn-p" disabled={saving} onclick={save}>
      {saving ? 'Saving…' : slug ? 'Save Changes' : 'Create Adversary'}
    </button>
  </div>
</div>

{#if createFeatureOpen}
  <div
    class="overlay show"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={e => e.target === e.currentTarget && (createFeatureOpen = false)}
    onkeydown={e => e.key === 'Escape' && (createFeatureOpen = false)}
  >
    <div class="modal modal-md">
      <div class="modal-title">New Feature</div>
      <FeatureEditor
        afterSave={onFeatureCreated}
        afterCancel={() => (createFeatureOpen = false)}
      />
    </div>
  </div>
{/if}

<style>
  .adv-editor {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .ed-title {
    margin: 0;
    font-family: var(--font-head);
    font-size: 1.5rem;
  }
  .lbl {
    display: block;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    margin-bottom: 4px;
    font-weight: 600;
  }

  .ed-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 22px;
    align-items: start;
  }
  @media (max-width: 900px) {
    .ed-grid { grid-template-columns: 1fr; }
  }

  .col { display: flex; flex-direction: column; gap: 10px; }

  .split-row {
    display: flex;
    gap: 6px;
  }
  .split-row input {
    flex: 1;
    min-width: 0;
  }
  .split-row select {
    flex-shrink: 0;
  }

  .empty-feats {
    color: var(--text-dim);
    font-style: italic;
    font-size: 0.8rem;
    padding: 12px 0;
  }

  .attached-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .attached-row {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 8px;
  }
  .attached-controls {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ord-btn {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-dim);
    cursor: pointer;
    padding: 0;
    width: 22px;
    height: 18px;
    border-radius: 2px;
    font-size: 0.65rem;
    line-height: 1;
  }
  .ord-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .ord-btn:hover:not(:disabled) { color: var(--text); border-color: var(--text-dim); }

  .attached-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .attached-head {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
  }
  .attached-name {
    font-weight: 600;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .attached-tx {
    font-size: 0.75rem;
    color: var(--text-dim);
    line-height: 1.35;
    max-height: 3.6em;
    overflow: hidden;
  }

  .ftype-mini {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 2px 6px;
    border-radius: 3px;
    background: var(--surface);
    color: var(--text-dim);
    border: 1px solid var(--border);
  }
  .ftype-mini.t-passive  { color: var(--feat-passive,  #6ec38c); border-color: currentColor; }
  .ftype-mini.t-action   { color: var(--feat-action,   #d8a040); border-color: currentColor; }
  .ftype-mini.t-reaction { color: var(--feat-reaction, #5aafdd); border-color: currentColor; }
  .ftype-mini.t-fear     { color: var(--feat-fear,     #d64040); border-color: currentColor; }

  .custom-pip {
    color: var(--accent, #b080ff);
    font-size: 0.75rem;
  }
  .missing-pip {
    color: var(--feat-fear, #d64040);
    font-size: 0.85rem;
    cursor: help;
  }

  .detach-btn {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 0 4px;
    font-size: 0.85rem;
    opacity: 0.5;
    line-height: 1;
  }
  .detach-btn:hover { color: var(--feat-fear); opacity: 1; }

  .note-input {
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 0.75rem;
    padding: 4px 7px;
    border-radius: 3px;
    font-family: var(--font-mono);
  }

  .divider-soft {
    border: none;
    border-top: 1px dashed var(--border);
    margin: 4px 0;
  }

  .picker-search {
    width: 100%;
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 6px 10px;
    border-radius: 3px;
    font-size: 0.85rem;
  }
  .picker-results {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 240px;
    overflow-y: auto;
    padding: 4px 0;
  }
  .picker-row {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 6px 8px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: pointer;
    text-align: left;
    color: var(--text);
    font-size: 0.82rem;
  }
  .picker-row:hover {
    background: var(--surface2);
    border-color: var(--border);
  }
  .picker-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .picker-empty {
    color: var(--text-dim);
    font-style: italic;
    font-size: 0.78rem;
    padding: 8px 4px;
  }

  .create-feature-btn {
    background: transparent;
    border: 1px dashed var(--border);
    color: var(--accent, #b080ff);
    padding: 7px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.82rem;
    margin-top: 4px;
  }
  .create-feature-btn:hover {
    background: color-mix(in srgb, var(--accent, #b080ff) 12%, transparent);
    border-color: var(--accent, #b080ff);
  }

  .ed-err {
    color: var(--feat-fear);
    font-size: 0.8rem;
    padding: 6px 10px;
    background: color-mix(in srgb, var(--feat-fear) 12%, transparent);
    border-radius: 3px;
  }

  .ed-bar {
    display: flex;
    gap: 8px;
    align-items: center;
    padding-top: 6px;
    border-top: 1px solid var(--border);
  }
  .ed-bar .btn-p { margin-left: auto; }
  .btn-danger { color: var(--feat-fear); }
  .btn-danger:hover {
    background: color-mix(in srgb, var(--feat-fear) 18%, var(--surface2));
  }

  .modal-md {
    width: 560px;
    max-width: 96vw;
  }
</style>
