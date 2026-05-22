<script>
  import DotTrack from './DotTrack.svelte';
  import CreatureCard from './CreatureCard.svelte';
  import { encounter } from '$lib/stores/encounter.js';

  let { creature } = $props();
  let expanded = $state(false);

  const COND_ON = {
    hidden:     'bg-[#0a2038] border-[#2a6090] text-[#7bbce0]',
    restrained: 'bg-[#2a1800] border-[#906020] text-[#d0a060]',
    vulnerable: 'bg-[#280a18] border-[#803050] text-[#d08090]',
  };
</script>

{#if expanded}
  <div class="w-full py-1">
    <CreatureCard {creature} />
    <button
      class="block w-full text-center mt-1 py-[3px] font-mono text-[0.55rem] uppercase tracking-[1px] text-text-faint bg-transparent border border-border rounded cursor-pointer hover:text-text-dim hover:border-border2"
      onclick={() => expanded = false}
    >▲ Collapse</button>
  </div>
{:else}
  <div
    class={[
      'flex items-center gap-[7px] bg-surface2 border border-pc-border rounded-md py-1 px-2 min-w-[200px] max-w-[440px] transition-[border-color] duration-[150ms] overflow-hidden',
      creature.spotlit && 'border-spotlight shadow-[0_0_0_1px_var(--accent-dim)]',
      creature.hp >= creature.maxHP && 'opacity-40',
    ]}
  >
    <button
      class={[
        'font-body text-[0.8rem] px-[5px] py-0.5 rounded-[3px] border cursor-pointer transition-all duration-[100ms]',
        creature.spotlit
          ? 'bg-black/30 border-accent-dim text-accent'
          : 'border-border bg-surface2 text-text-dim',
      ]}
      onclick={e => { e.stopPropagation(); encounter.toggleSpot(creature.id); }}
      title="Spotlight"
    >{creature.spotlit ? '★' : '☆'}</button>

    <span
      class="font-head text-[0.82rem] text-[#7abf94] shrink min-w-0 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px] hover:text-[#a0dfb4]"
      role="button"
      tabindex="0"
      onclick={() => expanded = true}
      onkeydown={e => e.key === 'Enter' && (expanded = true)}
      title={creature.name}
    >{creature.name}</span>

    <div class="flex flex-col gap-0.5 flex-1 min-w-0">
      <DotTrack type="hp"  max={creature.maxHP}  current={creature.hp}  creatureId={creature.id} showAside={false} compact={true} />
      {#if creature.maxStr > 0}
        <DotTrack type="str" max={creature.maxStr} current={creature.str} creatureId={creature.id} showAside={false} compact={true} />
      {/if}
      {#if creature.armor > 0}
        <DotTrack type="arm" max={creature.armor} current={creature.armUsed || 0} creatureId={creature.id} showAside={false} compact={true} />
      {/if}
    </div>

    <div class="flex gap-[3px] shrink-0">
      {#each [['H', 'hidden'], ['R', 'restrained'], ['V', 'vulnerable']] as [abbr, k] (abbr)}
        <button
          class={[
            'font-mono text-[0.5rem] font-semibold px-1 py-px rounded-[3px] border cursor-pointer transition-all duration-100 leading-[1.4]',
            creature.conds[k] ? COND_ON[k] : 'border-border bg-surface2 text-text-faint',
          ]}
          onclick={e => { e.stopPropagation(); encounter.toggleCond(creature.id, k); }}
          title={k.charAt(0).toUpperCase() + k.slice(1)}
        >{abbr}</button>
      {/each}
    </div>

    <button
      class="font-body text-[0.76rem] px-2 py-[3px] rounded-[3px] border border-border bg-surface2 text-text-dim cursor-pointer transition-all duration-[120ms] ml-auto hover:border-danger hover:text-danger"
      onclick={e => { e.stopPropagation(); encounter.removeCreature(creature.id); }}
      title="Remove"
    >✕</button>
  </div>
{/if}
