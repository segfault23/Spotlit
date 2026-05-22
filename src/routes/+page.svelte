<script>
  import { browser } from '$app/environment';
  import EncounterHeader from '$lib/components/EncounterHeader.svelte';
  import CreatureCard from '$lib/components/CreatureCard.svelte';
  import PCCompactCard from '$lib/components/PCCompactCard.svelte';
  import RosterModal from '$lib/components/RosterModal.svelte';
  import AddPCModal from '$lib/components/AddPCModal.svelte';
  import AddAdversaryModal from '$lib/components/AddAdversaryModal.svelte';
  import { encounter } from '$lib/stores/encounter.js';
  import { activeModal } from '$lib/stores/modal.js';

  // Lock viewport scroll while on the encounter page; restore on navigate away
  $effect(() => {
    if (!browser) return;
    document.documentElement.classList.add('no-scroll');
    return () => document.documentElement.classList.remove('no-scroll');
  });
</script>

<EncounterHeader />

<div class="flex-1 flex flex-col overflow-hidden relative z-[1]">
  <!-- PC strip: label stays fixed, cards scroll horizontally on small screens -->
  <div class="flex items-start gap-[10px] px-3 sm:px-[14px] py-[7px] border-b border-border bg-surface shrink-0">
    <span class="font-mono text-[0.6rem] uppercase tracking-[3px] text-text-dim self-center shrink-0">Party</span>
    <div class="flex flex-nowrap sm:flex-wrap gap-[5px] flex-1 min-w-0 overflow-x-auto">
      {#each $encounter.creatures.filter(c => c.isPC) as creature (creature.id)}
        <PCCompactCard {creature} />
      {:else}
        <span class="text-text-faint text-[0.8rem] italic self-center py-1">No PCs added yet.</span>
      {/each}
    </div>
  </div>

  <!-- Adversary grid: 1-col mobile → 2-col md → auto-fill lg -->
  <div class="flex-1 overflow-y-auto px-3 sm:px-[14px] py-[10px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[10px] content-start [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-[2px]">
    {#each $encounter.creatures.filter(c => !c.isPC) as creature (creature.id)}
      <CreatureCard {creature} />
    {:else}
      <div class="text-text-faint text-[0.88rem] italic text-center py-7 px-4 col-span-full">No adversaries yet.</div>
    {/each}
  </div>
</div>

{#if $activeModal === 'roster'}
  <RosterModal />
{:else if $activeModal === 'addPC'}
  <AddPCModal />
{:else if $activeModal === 'addAdv'}
  <AddAdversaryModal />
{/if}
