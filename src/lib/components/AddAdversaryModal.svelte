<script>
  import { presetsByName } from '$lib/stores/catalog.js';
  import { encounter } from '$lib/stores/encounter.js';
  import { closeModal } from '$lib/stores/modal.js';
  import { user } from '$lib/stores/user.js';

  let searchQuery = $state('');
  let selectedAdversaries = $state(new Set());

  // Per-preset quantities — map of name → count, defaults to 1.
  let quantities = $state({});

  // Custom creature save option
  let saveAsCustom = $state(false);

  // Logged-in user's saved custom creatures
  let customCreatures   = $state([]);
  let customLoading     = $state(false);

  $effect(() => {
    if ($user) {
      customLoading = true;
      fetch('/api/creatures')
        .then(r => r.ok ? r.json() : [])
        .then(data => { customCreatures = data; })
        .finally(() => { customLoading = false; });
    }
  });

  async function deleteCustom(slug, e) {
    e.stopPropagation();
    if (!confirm('Delete this custom adversary?')) return;
    await fetch(`/api/creatures/${slug}`, { method: 'DELETE' });
    customCreatures = customCreatures.filter(c => c.slug !== slug);
  }

  function getQty(name) { return quantities[name] ?? 1; }
  function adjQty(name, delta, e) {
    e.stopPropagation();
    quantities = { ...quantities, [name]: Math.max(1, Math.min(20, getQty(name) + delta)) };
  }

  // Reactive entries view of the preset catalogue.
  let PRESET_ENTRIES = $derived(Object.entries($presetsByName));

  // Form fields for manual entry / customising a single preset.
  let fName     = $state('');
  let fType     = $state('Solo');
  let fTier     = $state(3);
  let fDiff     = $state(17);
  let fAtk      = $state('+3');
  let fHP       = $state(10);
  let fStr      = $state(4);
  let fThresh   = $state('');
  let fDmg      = $state('');
  let fAtkName  = $state('');
  let fFeats    = $state('');

  let filteredPresets = $derived(
    searchQuery
      ? PRESET_ENTRIES.filter(([name, p]) =>
          (name + p.type).toLowerCase().includes(searchQuery.toLowerCase())
        )
      : PRESET_ENTRIES
  );

  let selectedCount = $derived(selectedAdversaries.size);
  let showCustomize = $derived(selectedCount <= 1);
  let addCount = $derived(
    selectedCount === 0 ? 1 :
    [...selectedAdversaries].reduce((sum, name) => sum + getQty(name), 0)
  );

  function togglePreset(name) {
    const next = new Set(selectedAdversaries);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    selectedAdversaries = next;

    if (selectedAdversaries.size === 1) {
      const onlyName = [...selectedAdversaries][0];
      loadPreset(onlyName);
    }
  }

  function loadPreset(name) {
    const p = $presetsByName[name];
    fName = name; fType = p.type; fTier = p.tier; fDiff = p.diff;
    fAtk = p.atk; fHP = p.hp; fStr = p.str; fThresh = p.thresh;
    fDmg = p.dmg; fAtkName = p.atkName; fFeats = p.feats.join(', ');
  }

  function loadCustom(creature) {
    fName = creature.name; fType = creature.type; fTier = creature.tier;
    fDiff = creature.diff; fAtk = creature.atk; fHP = creature.maxHP;
    fStr = creature.maxStr; fThresh = creature.thresh; fDmg = creature.dmg;
    fAtkName = creature.atkName; fFeats = (creature.feats ?? []).join(', ');
    selectedAdversaries = new Set();
  }

  function parseFeats(raw) {
    return raw ? raw.split(',').map(f => f.trim()).filter(Boolean) : [];
  }

  function buildFromForm(name) {
    return {
      name,
      type: fType, tier: +fTier, diff: +fDiff || 14,
      maxHP: +fHP || 6, maxStr: +fStr || 3,
      atk: fAtk, thresh: fThresh, dmg: fDmg, atkName: fAtkName,
      feats: parseFeats(fFeats),
    };
  }

  function buildFromPreset(presetName) {
    const p = $presetsByName[presetName];
    return {
      name: presetName,
      type: p.type, tier: p.tier, diff: p.diff,
      maxHP: p.hp, maxStr: p.str,
      atk: p.atk, thresh: p.thresh, dmg: p.dmg, atkName: p.atkName,
      feats: p.feats,
    };
  }

  async function addAdversary() {
    if (selectedCount === 0) {
      if (!fName.trim()) return;
      const creature = buildFromForm(fName.trim());
      encounter.addCreature(creature);
      if (saveAsCustom && $user) {
        await fetch('/api/creatures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creature),
        });
      }
    } else if (selectedCount === 1) {
      const onlyName = [...selectedAdversaries][0];
      const displayName = fName.trim() || onlyName;
      const qty = getQty(onlyName);
      for (let i = 0; i < qty; i++) {
        encounter.addCreature(buildFromForm(displayName));
      }
    } else {
      selectedAdversaries.forEach(presetName => {
        const qty = getQty(presetName);
        for (let i = 0; i < qty; i++) {
          encounter.addCreature(buildFromPreset(presetName));
        }
      });
    }
    closeModal();
  }
</script>

<div
  class="overlay show"
  role="dialog"
  aria-modal="true"
  tabindex="-1"
  onclick={e => e.target === e.currentTarget && closeModal()}
  onkeydown={e => e.key === 'Escape' && closeModal()}
>
  <div class="modal modal-lg">
    <div style="display:flex;align-items:center;gap:8px" class="modal-title">
      <span style="flex:1">Add Adversary</span>
      <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-dim);background:var(--surface2);padding:4px 8px;border-radius:3px;border:1px solid var(--border)">
        <span>{selectedCount}</span> selected
      </div>
    </div>

    <input
      class="modal-search"
      style="margin-bottom:4px"
      type="text"
      placeholder="Search adversaries…"
      bind:value={searchQuery}
    />

    <div class="modal-scroll-body">

      <!-- My Custom Adversaries (logged-in users only) -->
      {#if $user}
        <p class="sect-title">My Custom Adversaries</p>
        {#if customLoading}
          <div style="color:var(--text-dim);font-size:0.82rem;padding:4px 0">Loading…</div>
        {:else if customCreatures.length === 0}
          <div style="color:var(--text-dim);font-size:0.82rem;padding:4px 0;font-style:italic">None saved yet.</div>
        {:else}
          <div class="adv-list" style="margin-bottom:8px">
            {#each customCreatures as c (c.slug)}
              <div
                class="adv-row"
                role="button"
                tabindex="0"
                onclick={() => loadCustom(c)}
                onkeydown={e => e.key === 'Enter' && loadCustom(c)}
              >
                <div class="adv-row-name">{c.name}</div>
                <div class="adv-row-badge-group">
                  <span class="badge type">{c.type}</span>
                  <span class="badge">T{c.tier}</span>
                </div>
                <div class="adv-row-stats">HP {c.maxHP} · Diff {c.diff}</div>
                <button
                  class="adv-custom-del"
                  onclick={e => deleteCustom(c.slug, e)}
                  title="Delete custom adversary"
                >✕</button>
              </div>
            {/each}
          </div>
        {/if}
        <hr class="divider" />
      {/if}

      <!-- Preset catalogue -->
      <div class="adv-list">
        {#each filteredPresets as [name, p] (name)}
          {@const selected = selectedAdversaries.has(name)}
          <div
            class="adv-row"
            class:selected
            role="button"
            tabindex="0"
            onclick={() => togglePreset(name)}
            onkeydown={e => e.key === 'Enter' && togglePreset(name)}
          >
            <div class="adv-row-name">{name}</div>
            <div class="adv-row-badge-group">
              <span class="badge type">{p.type}</span>
              <span class="badge">T{p.tier}</span>
            </div>
            <div class="adv-row-stats">HP {p.hp} · Diff {p.diff}</div>
            {#if selected}
              <div class="adv-row-qty" onclick={e => e.stopPropagation()} role="presentation">
                <button class="adv-row-qty-btn" onclick={e => adjQty(name, -1, e)}>−</button>
                <span class="adv-row-qty-val">×{getQty(name)}</span>
                <button class="adv-row-qty-btn" onclick={e => adjQty(name, 1, e)}>+</button>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <hr class="divider" />

      {#if showCustomize}
        <p class="sect-title">
          {selectedCount === 1 ? 'Customize before adding' : 'Build a custom adversary'}
        </p>

        <div class="fgrow">
          <div class="fg"><label for="a-name">Name</label><input id="a-name" type="text" placeholder="Name" bind:value={fName} /></div>
          <div class="fg">
            <label for="a-type">Type</label>
            <select id="a-type" bind:value={fType}>
              {#each ['Bruiser','Horde','Leader','Minion','Ranged','Skulk','Social','Solo','Standard','Support'] as t}
                <option>{t}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="fgrow3">
          <div class="fg">
            <label for="a-tier">Tier</label>
            <select id="a-tier" bind:value={fTier}>
              <option value={1}>T1</option>
              <option value={2}>T2</option>
              <option value={3}>T3</option>
              <option value={4}>T4</option>
            </select>
          </div>
          <div class="fg"><label for="a-diff">Difficulty</label><input id="a-diff" type="number" bind:value={fDiff} /></div>
          <div class="fg"><label for="a-atk">ATK Mod</label><input id="a-atk" type="text" bind:value={fAtk} /></div>
        </div>

        <div class="fgrow">
          <div class="fg"><label for="a-hp">Max HP</label><input id="a-hp" type="number" min="1" bind:value={fHP} /></div>
          <div class="fg"><label for="a-str">Max Stress</label><input id="a-str" type="number" min="0" bind:value={fStr} /></div>
        </div>

        <div class="fgrow">
          <div class="fg"><label for="a-thresh">Thresholds (Major / Severe)</label><input id="a-thresh" type="text" placeholder="20 / 32" bind:value={fThresh} /></div>
          <div class="fg"><label for="a-dmg">Damage</label><input id="a-dmg" type="text" placeholder="3d12+5 phy" bind:value={fDmg} /></div>
        </div>

        <div class="fg"><label for="a-atkname">Standard Attack (name · range)</label><input id="a-atkname" type="text" placeholder="Bone Crush · Melee" bind:value={fAtkName} /></div>
        <div class="fg"><label for="a-feats">Features (comma-separated names)</label><input id="a-feats" type="text" placeholder="Ancient Colossus, Relentless, Death Rattle" bind:value={fFeats} /></div>

        {#if $user && selectedCount === 0}
          <label class="save-custom-label">
            <input type="checkbox" bind:checked={saveAsCustom} />
            Save as my custom adversary
          </label>
        {/if}
      {:else}
        <p class="sect-title">{selectedCount} adversaries selected</p>
        <p style="color:var(--text-dim);font-size:0.85rem;margin:4px 0 0">
          Each will be added with its own preset stats. Use the ×N buttons on each card to set quantities.
        </p>
      {/if}
    </div>

    <div class="modal-foot">
      <button class="btn-c" onclick={closeModal}>Cancel</button>
      <button class="btn-p" onclick={addAdversary}>
        {addCount === 1 ? 'Add to Encounter' : `Add ${addCount} to Encounter`}
      </button>
    </div>
  </div>
</div>

<style>
  .adv-custom-del {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 0 4px;
    font-size: 0.75rem;
    opacity: 0.5;
    margin-left: auto;
  }
  .adv-custom-del:hover {
    opacity: 1;
    color: var(--feat-fear);
  }
  .save-custom-label {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    font-size: 0.83rem;
    color: var(--text-dim);
    cursor: pointer;
  }
  .save-custom-label input {
    accent-color: var(--accent, #7c6fcd);
  }
</style>
