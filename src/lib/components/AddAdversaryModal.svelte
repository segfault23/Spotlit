<script>
  import { presetsByName } from '$lib/stores/catalog.js';
  import { encounter } from '$lib/stores/encounter.js';
  import { closeModal } from '$lib/stores/modal.js';

  let searchQuery = $state('');
  let selectedAdversaries = $state(new Set());

  // Reactive entries view of the preset catalogue (refills as the catalogue
  // store updates after server load).
  let PRESET_ENTRIES = $derived(Object.entries($presetsByName));

  // Form fields. These represent the single creature being authored or the
  // single preset being customized — never a "broadcast override" across
  // multiple selected presets.
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
  let fQuantity = $state(1);   // only meaningful when exactly one preset is selected

  let filteredPresets = $derived(
    searchQuery
      ? PRESET_ENTRIES.filter(([name, p]) =>
          (name + p.type).toLowerCase().includes(searchQuery.toLowerCase())
        )
      : PRESET_ENTRIES
  );

  let selectedCount = $derived(selectedAdversaries.size);
  // Customize panel only makes sense for a single creature — either
  // a fully-manual one (0 selected) or a single preset being tweaked.
  let showCustomize = $derived(selectedCount <= 1);
  // Total number of cards the Add button will create.
  let addCount = $derived(
    selectedCount === 0 ? 1 :
    selectedCount === 1 ? Math.max(1, +fQuantity || 1) :
    selectedCount
  );

  function togglePreset(name) {
    const next = new Set(selectedAdversaries);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    selectedAdversaries = next;

    // After toggling, repopulate the customize panel from the single remaining
    // selection (if any). When 2+ are selected, the panel is hidden and form
    // state is irrelevant. When 0 are selected, leave the form untouched so
    // a manual draft isn't wiped by exploratory clicking.
    if (selectedAdversaries.size === 1) {
      const onlyName = [...selectedAdversaries][0];
      loadPreset(onlyName);
      fQuantity = 1;
    }
  }

  function loadPreset(name) {
    const p = $presetsByName[name];
    fName = name; fType = p.type; fTier = p.tier; fDiff = p.diff;
    fAtk = p.atk; fHP = p.hp; fStr = p.str; fThresh = p.thresh;
    fDmg = p.dmg; fAtkName = p.atkName; fFeats = p.feats.join(', ');
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

  function addAdversary() {
    if (selectedCount === 0) {
      // Fully manual: requires a name; emits one creature.
      if (!fName.trim()) return;
      encounter.addCreature(buildFromForm(fName.trim()));
    } else if (selectedCount === 1) {
      // One preset, possibly customized, possibly multiplied.
      const onlyName = [...selectedAdversaries][0];
      const displayName = fName.trim() || onlyName;
      const qty = Math.max(1, +fQuantity || 1);
      for (let i = 0; i < qty; i++) {
        encounter.addCreature(buildFromForm(displayName));
      }
    } else {
      // 2+ presets: customize panel hidden — each added once with its own stats.
      selectedAdversaries.forEach(presetName => {
        encounter.addCreature(buildFromPreset(presetName));
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
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div class="modal-title" style="flex:1;margin:0;padding:0;border:none">Add Adversary</div>
      <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-dim);background:var(--surface2);padding:4px 8px;border-radius:3px;border:1px solid var(--border)">
        <span>{selectedCount}</span> selected
      </div>
    </div>

    <input
      class="modal-search"
      type="text"
      placeholder="Search adversaries…"
      bind:value={searchQuery}
    />

    <div class="adv-list">
      {#each filteredPresets as [name, p] (name)}
        <div
          class="adv-row"
          class:selected={selectedAdversaries.has(name)}
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

      {#if selectedCount === 1}
        <div class="fg" style="max-width:140px">
          <label for="a-qty">Quantity</label>
          <input id="a-qty" type="number" min="1" max="20" bind:value={fQuantity} />
        </div>
      {/if}
    {:else}
      <p class="sect-title">{selectedCount} adversaries selected</p>
      <p style="color:var(--text-dim);font-size:0.85rem;margin:4px 0 0">
        Each will be added with its own preset stats. To customize an adversary, select it on its own.
      </p>
    {/if}

    <div class="modal-foot">
      <button class="btn-c" onclick={closeModal}>Cancel</button>
      <button class="btn-p" onclick={addAdversary}>
        {addCount === 1 ? 'Add to Encounter' : `Add ${addCount} to Encounter`}
      </button>
    </div>
  </div>
</div>
