<script>
  import NumberStepper from '../NumberStepper.svelte';
  import {
    ITEM_CATEGORIES,
    CATEGORY_LABELS,
    WEAPON_TRAITS,
    WEAPON_RANGES,
    DAMAGE_TYPES,
    deriveStats,
    setEquipped,
    isEquippable,
    hasModifiers,
    inventoryItemFromCatalog,
    blankInventoryItem,
    formatWeaponDamage,
  } from '$lib/items.js';

  let {
    items = [],
    level = 1,
    character = {},
    onChange = () => {},
    showSummary = true,
  } = $props();

  let derived = $derived(deriveStats({ ...character, items, level }));

  // ── Catalogue browser ─────────────────────────────────────────────────────
  let browsing   = $state(false);
  let catalog    = $state(null); // null = not yet loaded
  let loading    = $state(false);
  let loadError  = $state(false);
  let search     = $state('');
  let catFilter  = $state('all');

  async function openBrowser() {
    browsing = true;
    if (catalog === null && !loading) {
      loading = true;
      loadError = false;
      try {
        const res = await fetch('/api/items');
        if (!res.ok) throw new Error();
        const data = await res.json();
        catalog = data.items ?? [];
      } catch {
        loadError = true;
        catalog = [];
      } finally {
        loading = false;
      }
    }
  }

  let filteredCatalog = $derived.by(() => {
    const list = catalog ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((i) => {
      if (catFilter !== 'all' && i.category !== catFilter) return false;
      if (q && !i.name.toLowerCase().includes(q) && !(i.description ?? '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  });

  // ── Mutations (controlled: emit a new array each time) ──────────────────────
  function emit(next) {
    onChange(next);
  }
  function addFromCatalog(catItem) {
    emit([...items, inventoryItemFromCatalog(catItem)]);
  }
  function removeItem(id) {
    emit(items.filter((i) => i.id !== id));
  }
  function updateItem(id, patch) {
    emit(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function toggleEquip(id, equipped) {
    emit(setEquipped(items, id, equipped));
  }
  function adjustQty(id, qty) {
    emit(items.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, qty) } : i)));
  }
  function useConsumable(item) {
    if (item.quantity <= 1) emit(items.filter((i) => i.id !== item.id));
    else emit(items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)));
  }

  // ── Custom item ─────────────────────────────────────────────────────────────
  let addingCustom = $state(false);
  let customName   = $state('');
  let customCat    = $state('utility');

  function addCustom() {
    if (!customName.trim()) return;
    emit([...items, { ...blankInventoryItem(customCat, customName.trim()), custom: true }]);
    customName = '';
    addingCustom = false;
  }

  function byCategory(cat) {
    return items.filter((i) => i.category === cat);
  }
</script>

<div class="inv">
  {#if showSummary && derived.hasGear}
    <div class="inv-summary">
      <div class="sum-stat"><span class="sum-label">Evasion</span><span class="sum-val">{derived.evasion}</span></div>
      <div class="sum-stat"><span class="sum-label">Armor</span><span class="sum-val">{derived.armorScore}</span></div>
      <div class="sum-stat"><span class="sum-label">Thresholds</span><span class="sum-val">{derived.thresholds.major} / {derived.thresholds.severe}</span></div>
      {#each derived.attacks as atk (atk.id)}
        <div class="sum-attack">
          <span class="atk-name">{atk.name}</span>
          <span class="atk-meta">{atk.trait} {atk.traitMod >= 0 ? '+' : ''}{atk.traitMod} · {atk.range} · {atk.damage}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#each ITEM_CATEGORIES as cat (cat)}
    {@const group = byCategory(cat)}
    {#if group.length}
      <div class="inv-group">
        <div class="group-label">{CATEGORY_LABELS[cat]}{cat === 'consumable' ? 's' : cat === 'utility' ? ' / Gear' : 's'}</div>
        {#each group as item (item.id)}
          <div class="item-row" class:equipped={item.equipped}>
            <div class="item-main">
              <span class="item-name">{item.name}</span>
              {#if item.tier > 1}<span class="chip">T{item.tier}</span>{/if}
              {#if item.custom}<span class="chip dim">custom</span>{/if}
              {#if hasModifiers(item.modifiers)}<span class="chip mod" title="Applies modifiers when equipped">mods</span>{/if}
              {#if item.feature}<span class="item-feature" title={item.feature.text}>★ {item.feature.name}</span>{/if}
            </div>

            {#if item.category === 'weapon'}
              <div class="item-detail">
                <select value={item.trait} onchange={(e) => updateItem(item.id, { trait: e.currentTarget.value })}>
                  {#each WEAPON_TRAITS as t (t)}<option value={t}>{t}</option>{/each}
                </select>
                <select value={item.range} onchange={(e) => updateItem(item.id, { range: e.currentTarget.value })}>
                  {#each WEAPON_RANGES as r (r)}<option value={r}>{r}</option>{/each}
                </select>
                <input class="dmg-inp" type="text" value={item.damageDice}
                  oninput={(e) => updateItem(item.id, { damageDice: e.currentTarget.value })} title="Damage die" />
                <select value={item.damageType} onchange={(e) => updateItem(item.id, { damageType: e.currentTarget.value })}>
                  {#each DAMAGE_TYPES as d (d)}<option value={d}>{d}</option>{/each}
                </select>
                <select class="slot-sel" value={item.weaponClass} onchange={(e) => updateItem(item.id, { weaponClass: e.currentTarget.value })}>
                  <option value="primary">primary</option>
                  <option value="secondary">secondary</option>
                </select>
                <span class="dmg-preview">{formatWeaponDamage(item, level)}</span>
              </div>
            {:else if item.category === 'armor'}
              <div class="item-detail">
                <label class="mini">Score<input class="mini-inp" type="number" min="0" value={item.baseScore}
                  oninput={(e) => updateItem(item.id, { baseScore: +e.currentTarget.value })} /></label>
                <label class="mini">Major<input class="mini-inp" type="number" min="0" value={item.baseMajor}
                  oninput={(e) => updateItem(item.id, { baseMajor: +e.currentTarget.value })} /></label>
                <label class="mini">Severe<input class="mini-inp" type="number" min="0" value={item.baseSevere}
                  oninput={(e) => updateItem(item.id, { baseSevere: +e.currentTarget.value })} /></label>
              </div>
            {:else}
              <div class="item-detail qty">
                <span class="qty-label">×</span>
                <NumberStepper size="sm" min={1} value={item.quantity} onchange={(v) => adjustQty(item.id, Number(v) || 1)} />
              </div>
            {/if}

            <div class="item-actions">
              {#if item.category === 'consumable'}
                <button class="act-btn use" onclick={() => useConsumable(item)} title="Use one">Use</button>
              {:else if isEquippable(item)}
                <label class="equip-toggle">
                  <input type="checkbox" checked={item.equipped} onchange={(e) => toggleEquip(item.id, e.currentTarget.checked)} />
                  Equip
                </label>
              {/if}
              <button class="rm-btn" onclick={() => removeItem(item.id)} title="Remove">✕</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/each}

  {#if items.length === 0}
    <p class="inv-empty">No items yet. Browse the catalogue or add a custom item.</p>
  {/if}

  <!-- Add controls -->
  <div class="inv-add">
    <button class="add-btn" onclick={openBrowser}>+ Add from catalogue</button>
    <button class="add-btn ghost" onclick={() => (addingCustom = !addingCustom)}>+ Custom item</button>
  </div>

  {#if addingCustom}
    <div class="custom-form">
      <input class="custom-name" type="text" placeholder="Item name…" bind:value={customName}
        onkeydown={(e) => e.key === 'Enter' && addCustom()} />
      <select bind:value={customCat}>
        {#each ITEM_CATEGORIES as c (c)}<option value={c}>{CATEGORY_LABELS[c]}</option>{/each}
      </select>
      <button class="add-btn" onclick={addCustom}>Add</button>
    </div>
  {/if}

  {#if browsing}
    <div class="browser">
      <div class="browser-head">
        <input class="browser-search" type="text" placeholder="Search items…" bind:value={search} />
        <select bind:value={catFilter}>
          <option value="all">All</option>
          {#each ITEM_CATEGORIES as c (c)}<option value={c}>{CATEGORY_LABELS[c]}</option>{/each}
        </select>
        <button class="browser-close" onclick={() => (browsing = false)}>Done</button>
      </div>
      {#if loading}
        <p class="browser-msg">Loading catalogue…</p>
      {:else if loadError}
        <p class="browser-msg err">Couldn't load the item catalogue.</p>
      {:else if filteredCatalog.length === 0}
        <p class="browser-msg">No matching items{catalog?.length === 0 ? ' — the catalogue is empty (seed items first)' : ''}.</p>
      {:else}
        <div class="browser-list">
          {#each filteredCatalog as cat (cat.slug)}
            <button class="cat-row" onclick={() => addFromCatalog(cat)}>
              <span class="cat-cat">{CATEGORY_LABELS[cat.category] ?? cat.category}</span>
              <span class="cat-name">{cat.name}</span>
              {#if cat.category === 'weapon'}
                <span class="cat-meta">{cat.trait} · {cat.range} · {cat.damageDice}{cat.damageType ? ' ' + cat.damageType : ''}</span>
              {:else if cat.category === 'armor'}
                <span class="cat-meta">Score {cat.baseScore} · {cat.baseMajor}/{cat.baseSevere}</span>
              {:else if cat.description}
                <span class="cat-meta">{cat.description}</span>
              {/if}
              <span class="cat-add">+</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .inv { display: flex; flex-direction: column; gap: 12px; }

  .inv-summary { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; }
  .sum-stat { display: flex; flex-direction: column; }
  .sum-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); font-weight: 600; }
  .sum-val { font-family: var(--font-mono); font-size: 1rem; color: var(--text); }
  .sum-attack { display: flex; flex-direction: column; border-left: 1px solid var(--border); padding-left: 14px; }
  .atk-name { font-size: 0.82rem; color: var(--text); }
  .atk-meta { font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim); }

  .inv-group { display: flex; flex-direction: column; gap: 5px; }
  .group-label { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); font-weight: 600; }

  .item-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 5px; padding: 7px 10px; }
  .item-row.equipped { border-color: var(--accent); }
  .item-main { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 140px; }
  .item-name { color: var(--text); font-size: 0.9rem; }
  .item-feature { font-size: 0.72rem; color: var(--accent); cursor: help; }
  .chip { font-family: var(--font-mono); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent); border: 1px solid var(--accent); border-radius: 3px; padding: 1px 5px; }
  .chip.dim { color: var(--text-dim); border-color: var(--border2); }
  .chip.mod { color: #6ec38c; border-color: #6ec38c; }

  .item-detail { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  .item-detail select, .item-detail input { background: var(--surface2); border: 1px solid var(--border); border-radius: 3px; color: var(--text); font-size: 0.78rem; padding: 3px 5px; font-family: inherit; }
  .dmg-inp { width: 48px; }
  .slot-sel { color: var(--text-dim); }
  .dmg-preview { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-dim); }
  .mini { display: flex; flex-direction: column; font-size: 0.56rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); }
  .mini-inp { width: 46px; }
  .qty { gap: 3px; }
  .qty-label { color: var(--text-dim); font-family: var(--font-mono); }

  .item-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
  .equip-toggle { display: flex; align-items: center; gap: 4px; font-size: 0.74rem; color: var(--text-dim); cursor: pointer; white-space: nowrap; }
  .act-btn { background: var(--surface2); border: 1px solid var(--border); border-radius: 4px; color: var(--text-dim); font-family: inherit; font-size: 0.74rem; padding: 3px 9px; cursor: pointer; }
  .act-btn.use:hover { border-color: var(--accent); color: var(--accent); }
  .rm-btn { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 0.85rem; padding: 2px 4px; }
  .rm-btn:hover { color: var(--danger); }

  .inv-empty { color: var(--text-dim); font-style: italic; font-size: 0.82rem; margin: 0; }

  .inv-add { display: flex; gap: 8px; flex-wrap: wrap; }
  .add-btn { background: var(--accent-dim); border: 1px solid var(--accent); border-radius: 4px; color: #f0dfa0; font-family: inherit; font-size: 0.8rem; padding: 6px 14px; cursor: pointer; }
  .add-btn.ghost { background: var(--surface2); border-color: var(--border); color: var(--text-dim); }
  .add-btn.ghost:hover { border-color: var(--accent); color: var(--accent); }

  .custom-form { display: flex; gap: 6px; flex-wrap: wrap; }
  .custom-name { flex: 1; min-width: 140px; background: var(--surface); border: 1px solid var(--border); border-radius: 3px; color: var(--text); font-size: 0.85rem; padding: 6px 9px; font-family: inherit; }
  .custom-form select { background: var(--surface); border: 1px solid var(--border); border-radius: 3px; color: var(--text); font-size: 0.85rem; padding: 6px; font-family: inherit; }

  .browser { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .browser-head { display: flex; gap: 6px; }
  .browser-search { flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 3px; color: var(--text); font-size: 0.85rem; padding: 6px 9px; font-family: inherit; }
  .browser-head select { background: var(--surface2); border: 1px solid var(--border); border-radius: 3px; color: var(--text); font-size: 0.82rem; padding: 4px; font-family: inherit; }
  .browser-close { background: var(--surface2); border: 1px solid var(--border); border-radius: 4px; color: var(--text-dim); font-family: inherit; font-size: 0.8rem; padding: 4px 12px; cursor: pointer; }
  .browser-msg { color: var(--text-dim); font-size: 0.82rem; margin: 4px 0; }
  .browser-msg.err { color: var(--danger); }
  .browser-list { display: flex; flex-direction: column; gap: 4px; max-height: 320px; overflow-y: auto; }
  .cat-row { display: flex; align-items: center; gap: 10px; background: var(--surface2); border: 1px solid var(--border); border-radius: 4px; padding: 6px 10px; cursor: pointer; text-align: left; font-family: inherit; }
  .cat-row:hover { border-color: var(--accent); }
  .cat-cat { font-family: var(--font-mono); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); width: 76px; flex-shrink: 0; }
  .cat-name { color: var(--text); font-size: 0.86rem; flex-shrink: 0; }
  .cat-meta { color: var(--text-dim); font-size: 0.72rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .cat-add { color: var(--accent); font-size: 1.1rem; margin-left: auto; flex-shrink: 0; }
</style>
