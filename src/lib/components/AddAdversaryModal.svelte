<script>
  import { presetsByName } from '$lib/stores/catalog.js';
  import { encounter } from '$lib/stores/encounter.js';
  import { closeModal } from '$lib/stores/modal.js';

  let searchQuery = $state('');
  let selectedAdversaries = $state(new Set());

  // Reactive entries view of the preset catalogue (refills as the catalogue
  // store updates after server load).
  let PRESET_ENTRIES = $derived(Object.entries($presetsByName));

  // Form fields
  let fName    = $state('');
  let fType    = $state('Solo');
  let fTier    = $state(3);
  let fDiff    = $state(17);
  let fAtk     = $state('+3');
  let fHP      = $state(10);
  let fStr     = $state(4);
  let fThresh  = $state('');
  let fDmg     = $state('');
  let fAtkName = $state('');
  let fFeats   = $state('');

  let filteredPresets = $derived(
    searchQuery
      ? PRESET_ENTRIES.filter(([name, p]) =>
          (name + p.type).toLowerCase().includes(searchQuery.toLowerCase())
        )
      : PRESET_ENTRIES
  );

  let selectedCount = $derived(selectedAdversaries.size);

  function togglePreset(name) {
    const next = new Set(selectedAdversaries);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
      loadPreset(name);
    }
    selectedAdversaries = next;
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

  function addAdversary() {
    if (selectedAdversaries.size === 0) {
      if (!fName.trim()) return;
      encounter.addCreature({
        name: fName.trim(),
        type: fType, tier: +fTier, diff: +fDiff || 14,
        maxHP: +fHP || 6, maxStr: +fStr || 3,
        atk: fAtk, thresh: fThresh, dmg: fDmg, atkName: fAtkName,
        feats: parseFeats(fFeats)
      });
    } else {
      selectedAdversaries.forEach(presetName => {
        const p = $presetsByName[presetName];
        encounter.addCreature({
          name: presetName,
          type:    fType !== 'Solo' ? fType    : p.type,
          tier:    fTier !== 3      ? +fTier   : p.tier,
          diff:    fDiff !== 17     ? +fDiff   : p.diff,
          maxHP:   fHP   !== 10     ? +fHP     : p.hp,
          maxStr:  fStr  !== 4      ? +fStr    : p.str,
          atk:     fAtk  !== '+3'   ? fAtk     : p.atk,
          thresh:  fThresh  || p.thresh,
          dmg:     fDmg     || p.dmg,
          atkName: fAtkName || p.atkName,
          feats:   parseFeats(fFeats).length ? parseFeats(fFeats) : p.feats,
        });
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
    <p class="sect-title">Customize before adding</p>

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

    <div class="modal-foot">
      <button class="btn-c" onclick={closeModal}>Cancel</button>
      <button class="btn-p" onclick={addAdversary}>
        {selectedCount > 0 ? `Add ${selectedCount} to Encounter` : 'Add to Encounter'}
      </button>
    </div>
  </div>
</div>
