<script>
  import { presetsByName } from '$lib/stores/catalog.js';
  import { encounter } from '$lib/stores/encounter.js';
  import { closeModal } from '$lib/stores/modal.js';
  import { user } from '$lib/stores/user.js';

  let searchQuery = $state('');
  let selectedAdversaries = $state(new Set());
  let quantities = $state({});

  // Reactive entries view of the catalogue (now merged: pre-made + custom)
  let allEntries = $derived(Object.entries($presetsByName));
  let customEntries = $derived(allEntries.filter(([_, p]) => p.custom));
  let presetEntries = $derived(allEntries.filter(([_, p]) => !p.custom));

  let filteredCustom = $derived(
    searchQuery
      ? customEntries.filter(([name, p]) =>
          (name + p.type).toLowerCase().includes(searchQuery.toLowerCase())
        )
      : customEntries
  );
  let filteredPresets = $derived(
    searchQuery
      ? presetEntries.filter(([name, p]) =>
          (name + p.type).toLowerCase().includes(searchQuery.toLowerCase())
        )
      : presetEntries
  );

  let selectedCount = $derived(selectedAdversaries.size);
  let addCount = $derived(
    selectedCount === 0 ? 0 :
    [...selectedAdversaries].reduce((sum, name) => sum + getQty(name), 0)
  );

  function getQty(name) { return quantities[name] ?? 1; }
  function adjQty(name, delta, e) {
    e.stopPropagation();
    quantities = { ...quantities, [name]: Math.max(1, Math.min(20, getQty(name) + delta)) };
  }

  function togglePreset(name) {
    const next = new Set(selectedAdversaries);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    selectedAdversaries = next;
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
    if (selectedCount === 0) return;
    selectedAdversaries.forEach(presetName => {
      const qty = getQty(presetName);
      for (let i = 0; i < qty; i++) {
        encounter.addCreature(buildFromPreset(presetName));
      }
    });
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
    <div class="modal-title-row">
      <span class="modal-title">Add Adversary</span>
      <span class="sel-pill">{selectedCount} selected</span>
    </div>

    <input
      class="modal-search"
      type="text"
      placeholder="Search adversaries…"
      bind:value={searchQuery}
    />

    <div class="modal-scroll-body">

      {#if $user && filteredCustom.length > 0}
        <p class="sect-title">★ My Custom Adversaries</p>
        <div class="adv-list">
          {#each filteredCustom as [name, p] (name)}
            {@const selected = selectedAdversaries.has(name)}
            <div
              class="adv-row custom"
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
      {/if}

      <p class="sect-title">Catalogue</p>
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

      <div class="profile-cta">
        Don't see what you need?
        {#if $user}
          <a href="/profile/adversaries/new">Build one on your Profile →</a>
        {:else}
          <a href="/auth/login">Sign in</a> to build your own.
        {/if}
      </div>

    </div>

    <div class="modal-foot">
      <button class="btn-c" onclick={closeModal}>Cancel</button>
      <button class="btn-p" onclick={addAdversary} disabled={addCount === 0}>
        {addCount === 0 ? 'Select to add' :
         addCount === 1 ? 'Add to Encounter' :
         `Add ${addCount} to Encounter`}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .modal-title { flex: 1; }
  .sel-pill {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-dim);
    background: var(--surface2);
    padding: 4px 8px;
    border-radius: 3px;
    border: 1px solid var(--border);
  }
  .modal-search { margin-bottom: 4px; }
  .adv-row.custom {
    border-left: 2px solid var(--accent, #b080ff);
  }
  .profile-cta {
    margin-top: 14px;
    padding: 10px 12px;
    background: var(--surface2);
    border: 1px dashed var(--border);
    border-radius: 4px;
    font-size: 0.82rem;
    color: var(--text-dim);
    text-align: center;
  }
  .profile-cta a {
    color: var(--accent, #b080ff);
    text-decoration: none;
    margin-left: 4px;
  }
  .profile-cta a:hover { text-decoration: underline; }
</style>
