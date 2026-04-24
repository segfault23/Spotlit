<script>
  import EncounterHeader from '$lib/components/EncounterHeader.svelte';
  import CreatureCard from '$lib/components/CreatureCard.svelte';
  import RosterModal from '$lib/components/RosterModal.svelte';
  import AddPCModal from '$lib/components/AddPCModal.svelte';
  import AddAdversaryModal from '$lib/components/AddAdversaryModal.svelte';
  import { encounter } from '$lib/stores/encounter.js';
  import { activeModal } from '$lib/stores/modal.js';
</script>

<EncounterHeader />

<div id="main">
  <div class="col">
    <div class="col-head"><span class="col-title">Party</span></div>
    <div class="col-body">
      {#each $encounter.creatures.filter(c => c.isPC) as creature (creature.id)}
        <CreatureCard {creature} />
      {:else}
        <div class="empty">None added yet.</div>
      {/each}
    </div>
  </div>

  <div class="col">
    <div class="col-head"><span class="col-title">Adversaries</span></div>
    <div class="col-body">
      {#each $encounter.creatures.filter(c => !c.isPC) as creature (creature.id)}
        <CreatureCard {creature} />
      {:else}
        <div class="empty">None added yet.</div>
      {/each}
    </div>
  </div>
</div>

{#if $activeModal === 'roster'}
  <RosterModal />
{:else if $activeModal === 'addPC'}
  <AddPCModal />
{:else if $activeModal === 'addAdv'}
  <AddAdversaryModal />
{/if}
