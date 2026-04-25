<script>
  import EncounterHeader from '$lib/components/EncounterHeader.svelte';
  import CreatureCard from '$lib/components/CreatureCard.svelte';
  import PCCompactCard from '$lib/components/PCCompactCard.svelte';
  import RosterModal from '$lib/components/RosterModal.svelte';
  import AddPCModal from '$lib/components/AddPCModal.svelte';
  import AddAdversaryModal from '$lib/components/AddAdversaryModal.svelte';
  import { encounter } from '$lib/stores/encounter.js';
  import { activeModal } from '$lib/stores/modal.js';
  import { featuresByName, presetsByName } from '$lib/stores/catalog.js';

  let { data } = $props();

  // Sync server-loaded catalogue into the client-side stores so any
  // descendant component can read them without prop-drilling.
  $effect(() => { featuresByName.set(data.featuresByName); });
  $effect(() => { presetsByName.set(data.presetsByName); });
</script>

<EncounterHeader />

<div id="main">
  <div class="pc-strip">
    <span class="col-title" style="align-self:center;flex-shrink:0">Party</span>
    {#each $encounter.creatures.filter(c => c.isPC) as creature (creature.id)}
      <PCCompactCard {creature} />
    {:else}
      <span class="empty" style="padding:4px 0;font-size:0.8rem;align-self:center">No PCs added yet.</span>
    {/each}
  </div>

  <div class="adv-grid">
    {#each $encounter.creatures.filter(c => !c.isPC) as creature (creature.id)}
      <CreatureCard {creature} />
    {:else}
      <div class="empty" style="grid-column:1/-1">No adversaries yet.</div>
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
