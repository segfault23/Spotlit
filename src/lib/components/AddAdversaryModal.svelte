<script>
  import { presetsByName } from '$lib/stores/catalog.js';
  import { encounter } from '$lib/stores/encounter.js';
  import { closeModal } from '$lib/stores/modal.js';
  import { user } from '$lib/stores/user.js';
  import { SvelteSet } from 'svelte/reactivity';

  let searchQuery = $state('');
  let selectedAdversaries = $state(new Set());
  let quantities = $state({});

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
    const next = new SvelteSet(selectedAdversaries);
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

  const qtyBtn = 'bg-black/25 border border-black/30 text-bg rounded-[3px] w-[18px] h-[18px] cursor-pointer text-xs font-bold flex items-center justify-center leading-none shrink-0 hover:bg-black/40';
</script>

<div
  class="fixed inset-0 bg-black/[.78] z-[100] flex items-center justify-center"
  role="dialog"
  aria-modal="true"
  tabindex="-1"
  onclick={e => e.target === e.currentTarget && closeModal()}
  onkeydown={e => e.key === 'Escape' && closeModal()}
>
  <div class="bg-surface border border-border2 rounded-[10px] p-5 w-[850px] max-w-[96vw] max-h-[92vh] overflow-hidden flex flex-col">
    <div class="flex items-center gap-2 mb-1.5">
      <span class="font-head text-[1.1rem] text-accent flex-1">Add Adversary</span>
      <span class="font-mono text-[0.7rem] text-text-dim bg-surface2 px-2 py-1 rounded-[3px] border border-border">{selectedCount} selected</span>
    </div>

    <input
      class="w-full bg-surface2 border border-border rounded px-[10px] py-[7px] text-text font-body text-[0.9rem] outline-none mb-1 focus:border-accent-dim placeholder:text-text-faint"
      type="text"
      placeholder="Search adversaries…"
      bind:value={searchQuery}
    />

    <div class="flex-1 overflow-y-auto min-h-0 flex flex-col gap-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-sm">

      {#if $user && filteredCustom.length > 0}
        <p class="font-mono text-[0.6rem] uppercase tracking-[2px] text-text-faint mb-1">★ My Custom Adversaries</p>
        <div class="grid gap-1.5" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))">
          {#each filteredCustom as [name, p] (name)}
            {@const selected = selectedAdversaries.has(name)}
            <div
              class={[
                'flex flex-col gap-1 p-2 border rounded-[5px] cursor-pointer transition-all duration-[120ms] justify-between border-l-2',
                selected
                  ? 'border-accent bg-accent opacity-85'
                  : 'border-border border-l-accent bg-surface2 hover:border-border2 hover:bg-surface3',
              ]}
              role="button"
              tabindex="0"
              onclick={() => togglePreset(name)}
              onkeydown={e => e.key === 'Enter' && togglePreset(name)}
            >
              <div class={selected ? 'text-bg font-head text-[0.9rem] font-medium' : 'font-head text-[0.9rem] font-medium'}>{name}</div>
              <div class="flex gap-[3px] flex-wrap">
                <span class={`font-mono text-[0.5rem] uppercase tracking-[1px] px-[3px] py-px rounded-sm border ${selected ? 'text-bg border-bg bg-black/20' : 'text-accent border-accent-dim bg-surface2'}`}>{p.type}</span>
                <span class={`font-mono text-[0.5rem] uppercase tracking-[1px] px-[3px] py-px rounded-sm border ${selected ? 'text-bg border-bg bg-black/20' : 'text-text-dim border-border bg-surface2'}`}>T{p.tier}</span>
              </div>
              <div class={`font-mono text-[0.55rem] leading-[1.3] ${selected ? 'text-black/60' : 'text-text-dim'}`}>HP {p.hp} · Diff {p.diff}</div>
              {#if selected}
                <div class="flex items-center gap-[5px] mt-1" onclick={e => e.stopPropagation()} role="presentation">
                  <button class={qtyBtn} onclick={e => adjQty(name, -1, e)}>−</button>
                  <span class="font-mono text-[0.7rem] font-semibold text-bg min-w-4 text-center">×{getQty(name)}</span>
                  <button class={qtyBtn} onclick={e => adjQty(name, 1, e)}>+</button>
                </div>
              {/if}
            </div>
          {/each}
        </div>
        <hr class="border-0 border-t border-border my-1" />
      {/if}

      <p class="font-mono text-[0.6rem] uppercase tracking-[2px] text-text-faint mb-1">Catalogue</p>
      <div class="grid gap-1.5" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))">
        {#each filteredPresets as [name, p] (name)}
          {@const selected = selectedAdversaries.has(name)}
          <div
            class={[
              'flex flex-col gap-1 p-2 border rounded-[5px] cursor-pointer transition-all duration-[120ms] justify-between',
              selected
                ? 'border-accent bg-accent opacity-85'
                : 'border-border bg-surface2 hover:border-border2 hover:bg-surface3',
            ]}
            role="button"
            tabindex="0"
            onclick={() => togglePreset(name)}
            onkeydown={e => e.key === 'Enter' && togglePreset(name)}
          >
            <div class={selected ? 'text-bg font-head text-[0.9rem] font-medium' : 'font-head text-[0.9rem] font-medium'}>{name}</div>
            <div class="flex gap-[3px] flex-wrap">
              <span class={`font-mono text-[0.5rem] uppercase tracking-[1px] px-[3px] py-px rounded-sm border ${selected ? 'text-bg border-bg bg-black/20' : 'text-accent border-accent-dim bg-surface2'}`}>{p.type}</span>
              <span class={`font-mono text-[0.5rem] uppercase tracking-[1px] px-[3px] py-px rounded-sm border ${selected ? 'text-bg border-bg bg-black/20' : 'text-text-dim border-border bg-surface2'}`}>T{p.tier}</span>
            </div>
            <div class={`font-mono text-[0.55rem] leading-[1.3] ${selected ? 'text-black/60' : 'text-text-dim'}`}>HP {p.hp} · Diff {p.diff}</div>
            {#if selected}
              <div class="flex items-center gap-[5px] mt-1" onclick={e => e.stopPropagation()} role="presentation">
                <button class={qtyBtn} onclick={e => adjQty(name, -1, e)}>−</button>
                <span class="font-mono text-[0.7rem] font-semibold text-bg min-w-4 text-center">×{getQty(name)}</span>
                <button class={qtyBtn} onclick={e => adjQty(name, 1, e)}>+</button>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <div class="profile-cta mt-[14px] px-3 py-[10px] bg-surface2 border border-dashed border-border rounded text-[0.82rem] text-text-dim text-center">
        Don't see what you need?
        {#if $user}
          <a href="/profile/adversaries/new">Build one on your Profile →</a>
        {:else}
          <a href="/auth/login">Sign in</a> to build your own.
        {/if}
      </div>

    </div>

    <div class="flex gap-[7px] justify-end pt-[10px] mt-[10px] border-t border-border shrink-0">
      <button class="bg-surface2 border border-border rounded px-3 py-[7px] text-text-dim font-body cursor-pointer text-[0.88rem]" onclick={closeModal}>Cancel</button>
      <button class="bg-accent-dim border border-accent rounded px-[18px] py-[7px] text-[#f0dfa0] font-body font-semibold cursor-pointer text-[0.88rem] transition-opacity hover:opacity-85 disabled:opacity-40" onclick={addAdversary} disabled={addCount === 0}>
        {addCount === 0 ? 'Select to add' :
         addCount === 1 ? 'Add to Encounter' :
         `Add ${addCount} to Encounter`}
      </button>
    </div>
  </div>
</div>

<style>
  .profile-cta a { color: var(--accent); text-decoration: none; margin-left: 4px; }
  .profile-cta a:hover { text-decoration: underline; }
</style>
