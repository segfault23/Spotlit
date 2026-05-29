<script>
  import { roster } from '$lib/stores/roster.js';
  import { encounter } from '$lib/stores/encounter.js';
  import { closeModal } from '$lib/stores/modal.js';
  import { onMount } from 'svelte';
  import NumberStepper from './NumberStepper.svelte';

  let activeTab = $state('campaign'); // 'campaign' | 'roster' | 'custom'

  // Campaign characters
  let campaignChars = $state([]);
  let loadingCampaign = $state(false);

  onMount(async () => {
    loadingCampaign = true;
    try {
      // Collect chars from all GM's campaigns
      const cr = await fetch('/api/campaigns');
      if (!cr.ok) return;
      const { campaigns } = await cr.json();
      const all = await Promise.all(
        campaigns.map(c =>
          fetch(`/api/campaigns/${c.joinCode}/characters`)
            .then(r => r.ok ? r.json() : { characters: [] })
            .then(({ characters }) => characters.map(ch => ({ ...ch, _campaignName: c.name })))
        )
      );
      campaignChars = all.flat();
    } catch { /* silently ignore */ } finally {
      loadingCampaign = false;
    }
  });

  function addFromCampaign(char) {
    encounter.addCreature({
      isPC: true,
      name: char.name,
      maxHP: char.maxHP ?? 6,
      hp: char.hp ?? char.maxHP ?? 6,
      maxStr: char.maxStress ?? 3,
      str: char.stress ?? 0,
      maxHope: char.maxHope ?? 5,
      hope: char.hope ?? char.maxHope ?? 5,
      evasion: char.evasion ?? 10,
      armor: char.armorSlots ?? 0,
      armUsed: char.armorUsed ?? 0,
      charRef: { ownerSub: char.ownerSub, charId: char.id },
    });
    closeModal();
  }

  // Roster tab
  function addFromRoster(r) {
    encounter.addCreature({
      isPC: true,
      name: r.name,
      maxHP: r.maxHP,
      maxStr: r.maxStr,
      evasion: r.evasion,
      armor: r.armor,
      armUsed: 0,
    });
    closeModal();
  }

  // Custom tab
  let name    = $state('');
  let maxHP   = $state(6);
  let maxStr  = $state(6);
  let evasion = $state(10);
  let armor   = $state(0);
  let maxHope = $state(5);

  function addCustom() {
    if (!name.trim()) return;
    encounter.addCreature({
      isPC: true,
      name: name.trim(),
      maxHP: +maxHP || 6,
      hp: +maxHP || 6,
      maxStr: +maxStr || 6,
      str: 0,
      maxHope: +maxHope || 5,
      hope: +maxHope || 5,
      evasion: +evasion || 10,
      armor: +armor || 0,
      armUsed: 0,
    });
    name = '';
    closeModal();
  }

  const inputCls = 'bg-surface2 border border-border rounded px-2 py-1.5 text-text font-body text-[0.88rem] outline-none w-full focus:border-accent-dim';
  const labelCls = 'font-mono text-[0.58rem] uppercase tracking-[1.5px] text-text-dim';
  const addBtn = 'bg-surface2 border border-border text-text px-[10px] py-1 rounded-[3px] cursor-pointer text-[0.8rem] shrink-0 hover:border-accent hover:text-accent';
</script>

<div
  class="fixed inset-0 bg-black/[.78] z-[100] flex items-center justify-center"
  role="dialog"
  aria-modal="true"
  tabindex="-1"
  onclick={e => e.target === e.currentTarget && closeModal()}
  onkeydown={e => e.key === 'Escape' && closeModal()}
>
  <div class="bg-surface border border-border2 rounded-[10px] p-5 w-[380px] max-w-[96vw] max-h-[88vh] overflow-hidden flex flex-col">
    <div class="font-head text-[1.1rem] text-accent pb-[10px] border-b border-border shrink-0 mb-3">Add PC to Encounter</div>

    <div class="modal-tab-strip">
      <button class="modal-tab" class:active={activeTab === 'campaign'} onclick={() => (activeTab = 'campaign')}>Campaign</button>
      <button class="modal-tab" class:active={activeTab === 'roster'}   onclick={() => (activeTab = 'roster')}>Roster</button>
      <button class="modal-tab" class:active={activeTab === 'custom'}   onclick={() => (activeTab = 'custom')}>Custom</button>
    </div>

    <div class="flex-1 overflow-y-auto min-h-0 flex flex-col gap-3 pt-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-sm">

      {#if activeTab === 'campaign'}
        {#if loadingCampaign}
          {#each {length: 3} as _}
            <div class="flex items-center gap-[10px] py-2 border-b border-border last:border-b-0">
              <div class="flex-1 flex flex-col gap-1">
                <div class="h-4 w-32 bg-surface3 rounded animate-pulse"></div>
                <div class="h-3 w-48 bg-surface3 rounded animate-pulse"></div>
                <div class="h-3 w-36 bg-surface3 rounded animate-pulse"></div>
              </div>
              <div class="h-7 w-12 bg-surface3 rounded animate-pulse shrink-0"></div>
            </div>
          {/each}
        {:else if campaignChars.length === 0}
          <div class="text-text-dim text-[0.82rem] py-3 text-center italic">No campaign characters found. Create a campaign and have players join via <a class="text-accent" href="/campaigns/new">Campaigns</a>.</div>
        {:else}
          {#each campaignChars as char (char.id)}
            <div class="flex items-center gap-[10px] py-2 border-b border-border last:border-b-0">
              <div class="flex-1">
                <div class="font-semibold text-[0.88rem]">{char.name || 'Unnamed'}</div>
                <div class="text-[0.72rem] text-text-dim mt-0.5">
                  {[char.class, char.subclass].filter(Boolean).join(' · ')}
                  {char.class ? ' · ' : ''}HP {char.maxHP} · Stress {char.maxStress} · Hope {char.maxHope}
                </div>
                <div class="text-[0.68rem] text-text-faint italic">{char._campaignName} · {char.playerName || 'Unknown player'}</div>
              </div>
              <button class={addBtn} onclick={() => addFromCampaign(char)}>+ Add</button>
            </div>
          {/each}
        {/if}
      {/if}

      {#if activeTab === 'roster'}
        <div class="flex flex-col">
          {#if $roster.length}
            {#each $roster as r (r.id)}
              <div class="flex items-center gap-[10px] py-2 border-b border-border last:border-b-0">
                <div class="flex-1">
                  <div class="font-semibold text-[0.88rem]">{r.name}</div>
                  <div class="text-[0.72rem] text-text-dim mt-0.5">HP {r.maxHP} · Stress {r.maxStr} · Evasion {r.evasion}</div>
                </div>
                <button class={addBtn} onclick={() => addFromRoster(r)}>+ Add</button>
              </div>
            {/each}
          {:else}
            <div class="text-text-dim text-[0.82rem] py-3 text-center italic">No roster characters saved yet.</div>
          {/if}
        </div>
      {/if}

      {#if activeTab === 'custom'}
        <div class="flex flex-col gap-1">
          <label for="pc-name" class={labelCls}>Name</label>
          <input id="pc-name" type="text" placeholder="Character name" class={inputCls} bind:value={name} />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label for="pc-hp" class={labelCls}>Max HP</label>
            <NumberStepper id="pc-hp" min={1} bind:value={maxHP} />
          </div>
          <div class="flex flex-col gap-1">
            <label for="pc-str" class={labelCls}>Max Stress</label>
            <NumberStepper id="pc-str" min={1} bind:value={maxStr} />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label for="pc-hope" class={labelCls}>Max Hope</label>
            <NumberStepper id="pc-hope" min={1} bind:value={maxHope} />
          </div>
          <div class="flex flex-col gap-1">
            <label for="pc-ev" class={labelCls}>Evasion</label>
            <NumberStepper id="pc-ev" bind:value={evasion} />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label for="pc-arm" class={labelCls}>Armor Slots</label>
          <NumberStepper id="pc-arm" min={0} bind:value={armor} />
        </div>
      {/if}

    </div>

    <div class="flex gap-[7px] justify-end pt-[10px] mt-[10px] border-t border-border shrink-0">
      <button class="bg-surface2 border border-border rounded px-3 py-[7px] text-text-dim font-body cursor-pointer text-[0.88rem]" onclick={closeModal}>Cancel</button>
      {#if activeTab === 'custom'}
        <button class="bg-accent-dim border border-accent rounded px-[18px] py-[7px] text-[#f0dfa0] font-body font-semibold cursor-pointer text-[0.88rem] transition-opacity hover:opacity-85" onclick={addCustom}>Add Custom PC</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-tab-strip {
    display: flex;
    border-bottom: 1px solid var(--border);
    padding: 0 12px;
    gap: 2px;
    flex-shrink: 0;
  }
  .modal-tab {
    background: transparent;
    border: none;
    color: var(--text-dim);
    padding: 8px 12px;
    font-size: 0.82rem;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    font-family: inherit;
  }
  .modal-tab:hover { color: var(--text); }
  .modal-tab.active { color: var(--text); border-bottom-color: var(--accent); }
</style>
