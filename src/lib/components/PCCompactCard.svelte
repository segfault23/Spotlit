<script>
  import DotTrack from './DotTrack.svelte';
  import CreatureCard from './CreatureCard.svelte';
  import { encounter } from '$lib/stores/encounter.js';

  let { creature } = $props();
  let expanded = $state(false);
</script>

{#if expanded}
  <div class="pc-expanded">
    <CreatureCard {creature} />
    <button class="pc-collapse-btn" onclick={() => expanded = false}>▲ Collapse</button>
  </div>
{:else}
  <div
    class="pc-compact"
    class:spotlit={creature.spotlit}
    class:defeated={creature.hp >= creature.maxHP}
  >
    <button
      class="cf-btn spot pc-spot"
      class:on={creature.spotlit}
      onclick={e => { e.stopPropagation(); encounter.toggleSpot(creature.id); }}
      title="Spotlight"
    >{creature.spotlit ? '★' : '☆'}</button>

    <span
      class="cname pc-cname"
      role="button"
      tabindex="0"
      onclick={() => expanded = true}
      onkeydown={e => e.key === 'Enter' && (expanded = true)}
      title={creature.name}
    >{creature.name}</span>

    <div class="pc-tracks">
      <DotTrack type="hp"  max={creature.maxHP}  current={creature.hp}  creatureId={creature.id} showAside={false} />
      {#if creature.maxStr > 0}
        <DotTrack type="str" max={creature.maxStr} current={creature.str} creatureId={creature.id} showAside={false} />
      {/if}
      {#if creature.armor > 0}
        <DotTrack type="arm" max={creature.armor} current={creature.armUsed || 0} creatureId={creature.id} showAside={false} />
      {/if}
    </div>

    <div class="pc-conds">
      {#each [['H', 'hidden'], ['R', 'restrained'], ['V', 'vulnerable']] as [abbr, k]}
        <button
          class="pc-cond {k}"
          class:on={creature.conds[k]}
          onclick={e => { e.stopPropagation(); encounter.toggleCond(creature.id, k); }}
          title={k.charAt(0).toUpperCase() + k.slice(1)}
        >{abbr}</button>
      {/each}
    </div>

    <button
      class="cf-btn rm"
      onclick={e => { e.stopPropagation(); encounter.removeCreature(creature.id); }}
      title="Remove"
    >✕</button>
  </div>
{/if}
