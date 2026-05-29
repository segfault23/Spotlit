<script>
  import DomainCard from './DomainCard.svelte';

  let {
    loadout = [],
    vault = [],
    domains = [],
    maxLevel = 10,
    maxTotal = null,
    onLoadoutChange = () => {},
    onVaultChange = () => {},
  } = $props();

  let cards = $state([]);
  let loading = $state(false);
  let filterDomain = $state('');
  let filterType = $state('');
  let vaultExpanded = $state(false);
  let pickerExpanded = $state(true);

  let addedNames = $derived(new Set([...loadout, ...vault]));
  // Total cards chosen across loadout + vault. When a maxTotal is set (e.g. the
  // two cards a level-1 character may pick) we stop accepting new cards once the
  // cap is reached. Moving a card between loadout and vault never adds to the
  // total, so it stays allowed.
  let totalSelected = $derived(loadout.length + vault.length);
  let atTotalLimit = $derived(maxTotal != null && totalSelected >= maxTotal);
  let loadoutFull = $derived(loadout.length >= 5);
  // The picker's "+ Add" button pulls new cards in, so it must respect both the
  // 5-card active cap and the overall total cap.
  let addDisabled = $derived(loadoutFull || atTotalLimit);
  // The active loadout can never exceed the overall cap when one is set.
  let loadoutCap = $derived(maxTotal != null ? Math.min(5, maxTotal) : 5);

  let cardByName = $derived(Object.fromEntries(cards.map(c => [c.name, c])));

  let availableCards = $derived(
    cards.filter(c =>
      !addedNames.has(c.name) &&
      (filterDomain === '' || c.domain === filterDomain) &&
      (filterType === '' || c.type === filterType)
    )
  );

  let cardTypes = $derived([...new Set(cards.map(c => c.type))].sort());

  $effect(() => {
    const domainStr = domains.join(',');
    if (!domainStr) { cards = []; return; }
    let alive = true;
    loading = true;
    fetch(`/api/cards/domain?domains=${encodeURIComponent(domainStr)}&maxLevel=${maxLevel}`)
      .then(r => r.json())
      .then(data => { if (alive) { cards = data; loading = false; } })
      .catch(() => { if (alive) loading = false; });
    return () => { alive = false; };
  });

  function addToVault(name) {
    if (addDisabled) return;
    onVaultChange([...vault, name]);
  }

  function moveToLoadout(name) {
    if (loadout.length >= 5) return;
    onLoadoutChange([...loadout, name]);
    onVaultChange(vault.filter(n => n !== name));
  }

  function moveToVault(name) {
    onVaultChange([...vault, name]);
    onLoadoutChange(loadout.filter(n => n !== name));
  }

  function removeFromLoadout(name) {
    onLoadoutChange(loadout.filter(n => n !== name));
  }

  function removeFromVault(name) {
    onVaultChange(vault.filter(n => n !== name));
  }
</script>

<!-- Active loadout -->
<div class="picker-section">
  <div class="picker-section-head">
    <span class="picker-section-title">Active Loadout</span>
    <span class="loadout-count" class:full={loadout.length >= loadoutCap}>{loadout.length} / {loadoutCap}</span>
  </div>

  {#if loadout.length === 0}
    <div class="picker-empty">No cards in active loadout. Add cards from the picker below.</div>
  {:else}
    <div class="card-list">
      {#each loadout as name (name)}
        {@const card = cardByName[name]}
        {#if card}
          <DomainCard
            {card}
            mode="loadout"
            onMoveToVault={moveToVault}
            onRemove={removeFromLoadout}
          />
        {:else}
          <div class="card-stub">{name}</div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<!-- Vault -->
<div class="picker-section">
  <button class="picker-section-head toggle-head" onclick={() => (vaultExpanded = !vaultExpanded)}>
    <span class="picker-section-title">Vault</span>
    <span class="vault-count">{vault.length} card{vault.length !== 1 ? 's' : ''}</span>
    <span class="chevron">{vaultExpanded ? '▲' : '▼'}</span>
  </button>

  {#if vaultExpanded}
    {#if vault.length === 0}
      <div class="picker-empty">Vault is empty.</div>
    {:else}
      <div class="card-list">
        {#each vault as name (name)}
          {@const card = cardByName[name]}
          {#if card}
            <DomainCard
              {card}
              mode="vault"
              {loadoutFull}
              onMoveToLoadout={moveToLoadout}
              onRemove={removeFromVault}
            />
          {:else}
            <div class="card-stub">{name}</div>
          {/if}
        {/each}
      </div>
    {/if}
  {/if}
</div>

<!-- Card picker -->
<div class="picker-section">
  <button class="picker-section-head toggle-head" onclick={() => (pickerExpanded = !pickerExpanded)}>
    <span class="picker-section-title">Add Cards</span>
    {#if loading}<span class="loading-txt">Loading…</span>{/if}
    {#if maxTotal != null}
      <span class="chosen-count" class:full={atTotalLimit}>{totalSelected} / {maxTotal} chosen</span>
    {/if}
    <span class="chevron">{pickerExpanded ? '▲' : '▼'}</span>
  </button>

  {#if pickerExpanded}
    <div class="picker-filters">
      <div class="filter-group">
        <button class="filter-btn" class:active={filterDomain === ''} onclick={() => (filterDomain = '')}>All</button>
        {#each domains as d (d)}
          <button class="filter-btn" class:active={filterDomain === d} onclick={() => (filterDomain = filterDomain === d ? '' : d)}>{d}</button>
        {/each}
      </div>
      {#if cardTypes.length > 1}
        <div class="filter-group">
          <button class="filter-btn" class:active={filterType === ''} onclick={() => (filterType = '')}>All types</button>
          {#each cardTypes as t (t)}
            <button class="filter-btn" class:active={filterType === t} onclick={() => (filterType = filterType === t ? '' : t)}>{t}</button>
          {/each}
        </div>
      {/if}
    </div>

    {#if loading}
      <div class="picker-empty">Loading cards…</div>
    {:else if atTotalLimit}
      <div class="picker-empty">You've chosen all {maxTotal} cards. Remove one to swap your selection.</div>
    {:else if availableCards.length === 0}
      <div class="picker-empty">{addedNames.size > 0 && cards.length > 0 ? 'All available cards added.' : 'No cards match the current filters.'}</div>
    {:else}
      <div class="card-list">
        {#each availableCards as card (card.name)}
          <DomainCard
            {card}
            mode="picker"
            loadoutFull={addDisabled}
            added={addedNames.has(card.name)}
            onMoveToVault={addToVault}
          />
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .picker-section { display: flex; flex-direction: column; gap: 6px; background: var(--surface2); border: 1px solid var(--border); border-radius: 5px; padding: 10px 12px; }
  .picker-section-head { display: flex; align-items: center; gap: 8px; }
  .toggle-head { background: none; border: none; color: inherit; cursor: pointer; text-align: left; padding: 0; width: 100%; font-family: inherit; }
  .toggle-head:hover .picker-section-title { color: var(--accent); }
  .picker-section-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; color: var(--text-dim); flex: 1; }
  .loadout-count { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-dim); }
  .loadout-count.full { color: #d8a040; }
  .vault-count { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-dim); }
  .chosen-count { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-dim); }
  .chosen-count.full { color: #6ec38c; }
  .loading-txt { font-size: 0.72rem; color: var(--text-dim); font-style: italic; }
  .chevron { font-size: 0.65rem; color: var(--text-dim); }
  .picker-empty { font-size: 0.78rem; color: var(--text-dim); font-style: italic; padding: 4px 0; }
  .card-list { display: flex; flex-direction: column; gap: 6px; }
  .card-stub { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 8px 10px; font-size: 0.82rem; color: var(--text-dim); font-style: italic; }
  .picker-filters { display: flex; flex-direction: column; gap: 6px; }
  .filter-group { display: flex; gap: 4px; flex-wrap: wrap; }
  .filter-btn { background: var(--surface); border: 1px solid var(--border); color: var(--text-dim); padding: 3px 10px; border-radius: 3px; font-size: 0.7rem; font-family: var(--font-mono); cursor: pointer; }
  .filter-btn:hover { border-color: var(--accent); color: var(--accent); }
  .filter-btn.active { background: color-mix(in srgb, var(--accent) 15%, var(--surface)); border-color: var(--accent); color: var(--accent); }
</style>
