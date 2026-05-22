<script>
  import DotTrack from './DotTrack.svelte';
  import FeatureBlock from './FeatureBlock.svelte';
  import { encounter } from '$lib/stores/encounter.js';

  let { creature } = $props();

  let defeated = $derived(!creature.isPC && creature.hp >= creature.maxHP);
  let expanded = $derived($encounter.expandedFeats.includes(creature.id));

  const CONDITIONS = ['Hidden', 'Restrained', 'Vulnerable'];

  const COND_ON = {
    hidden:     'bg-[#0a2038] border-[#2a6090] text-[#7bbce0]',
    restrained: 'bg-[#2a1800] border-[#906020] text-[#d0a060]',
    vulnerable: 'bg-[#280a18] border-[#803050] text-[#d08090]',
  };

  const cfBtn = 'font-body text-[0.76rem] px-2 py-[3px] rounded-[3px] border border-border bg-surface2 text-text-dim cursor-pointer transition-all duration-[120ms] hover:border-border2 hover:text-text';
</script>

<div class={[
  'bg-surface border border-border rounded-[7px] p-[11px] mb-[9px] relative transition-[border-color] duration-200',
  creature.isPC && 'border-l-[3px] border-l-pc-border',
  creature.spotlit && 'border-spotlight shadow-[0_0_0_1px_var(--accent-dim)]',
  defeated && 'opacity-55',
]}>
  <!-- Top row: name + badges -->
  <div class="flex items-start gap-2 mb-2">
    <div class={`font-head text-base flex-1 leading-[1.2] ${creature.isPC ? 'text-[#7abf94]' : 'text-text'}`}>{creature.name}</div>
    {#if !creature.isPC}
      <div class="flex gap-[3px] shrink-0 flex-wrap justify-end">
        <span class="font-mono text-[0.56rem] uppercase tracking-[1px] px-[5px] py-px rounded-[3px] border border-accent-dim bg-surface2 text-accent">{creature.type}</span>
        <span class="font-mono text-[0.56rem] uppercase tracking-[1px] px-[5px] py-px rounded-[3px] border border-border bg-surface2 text-text-dim">T{creature.tier}</span>
      </div>
    {/if}
  </div>

  <!-- HP / Stress / Armor -->
  <DotTrack type="hp" max={creature.maxHP} current={creature.hp} creatureId={creature.id} />
  {#if creature.maxStr > 0}
    <DotTrack type="str" max={creature.maxStr} current={creature.str} creatureId={creature.id} />
  {/if}
  {#if creature.isPC && creature.armor > 0}
    <DotTrack type="arm" max={creature.armor} current={creature.armUsed || 0} creatureId={creature.id} showAside={false} />
  {/if}

  <!-- Quick stats -->
  {#if creature.isPC}
    <div class="flex gap-2 flex-wrap my-[5px] py-[5px] px-[7px] bg-surface2 rounded">
      <span class="font-mono text-[0.6rem] text-text-dim">Evasion <strong class="text-text font-medium">{creature.evasion}</strong></span>
    </div>
  {:else}
    <div class="flex gap-2 flex-wrap my-[5px] py-[5px] px-[7px] bg-surface2 rounded">
      <span class="font-mono text-[0.6rem] text-text-dim">Diff <strong class="text-text font-medium">{creature.diff}</strong></span>
      <span class="font-mono text-[0.6rem] text-text-dim">ATK <strong class="text-text font-medium">{creature.atk}</strong></span>
      {#if creature.thresh}
        <span class="font-mono text-[0.6rem] text-text-dim">Thresh <strong class="text-text font-medium">{creature.thresh}</strong></span>
      {/if}
    </div>
    {#if creature.atkName || creature.dmg}
      <div class="font-mono text-[0.66rem] text-text-dim py-[3px] px-[7px] bg-surface3 rounded border-l-2 border-l-accent-dim my-[5px]">
        <strong class="text-text">{creature.atkName || 'Attack'}</strong>{creature.dmg ? ' — ' + creature.dmg : ''}
      </div>
    {/if}

    <!-- Features -->
    {#if creature.feats && creature.feats.length}
      <button
        class="flex items-center gap-1.5 cursor-pointer bg-transparent border-0 text-text-faint font-mono text-[0.6rem] uppercase tracking-[1px] py-1 px-0 w-full text-left hover:text-text-dim"
        onclick={() => encounter.toggleFeats(creature.id)}
      >
        <span class={`text-[0.7rem] transition-transform duration-200 inline-block ${expanded ? 'rotate-90' : ''}`}>▶</span>
        Features ({creature.feats.length})
      </button>
      <div class="flex flex-wrap gap-[3px] mb-0.5">
        {#each creature.feats as feat (feat)}
          <span class="font-mono text-[0.56rem] px-[5px] py-px rounded-[3px] bg-surface3 border border-border text-text-dim">{feat.split('|')[0]}</span>
        {/each}
      </div>
      {#if expanded}
        <div class="mt-1.5 flex flex-col gap-[5px]">
          {#each creature.feats as feat (feat)}
            <FeatureBlock {feat} />
          {/each}
        </div>
      {/if}
    {/if}
  {/if}

  <!-- Conditions -->
  <div class="flex gap-1 my-[5px] flex-wrap">
    {#each CONDITIONS as cond (cond)}
      {@const k = cond.toLowerCase()}
      <button
        class={[
          'font-mono text-[0.58rem] uppercase tracking-[0.5px] px-[7px] py-0.5 rounded-[3px] border cursor-pointer transition-all duration-100',
          creature.conds[k] ? COND_ON[k] : 'border-border bg-surface2 text-text-faint',
        ]}
        onclick={() => encounter.toggleCond(creature.id, k)}
      >{cond}</button>
    {/each}
  </div>

  <!-- Notes -->
  <textarea
    class="w-full bg-surface2 border border-border rounded-[3px] text-text-dim font-body text-[0.78rem] px-1.5 py-1 resize-none min-h-8 mt-1.5 outline-none leading-[1.4] placeholder:text-text-faint focus:border-border2"
    placeholder="Notes…"
    value={creature.notes}
    onchange={e => encounter.setNotes(creature.id, e.currentTarget.value)}
  ></textarea>

  <!-- Footer -->
  <div class="flex gap-1 mt-[7px] pt-[7px] border-t border-border flex-wrap">
    <button
      class={[
        'font-body text-[0.76rem] px-2 py-[3px] rounded-[3px] border cursor-pointer transition-all duration-[120ms]',
        creature.spotlit
          ? 'bg-black/30 border-accent-dim text-accent hover:border-accent hover:text-accent'
          : 'border-border bg-surface2 text-text-dim hover:border-border2 hover:text-text',
      ]}
      onclick={() => encounter.toggleSpot(creature.id)}
    >{creature.spotlit ? '★ Spotlit' : '☆ Spotlight'}</button>

    {#if !creature.isPC}
      <button class={cfBtn} onclick={() => encounter.quickHP(creature.id, -1)}>HP−</button>
      <button class={cfBtn} onclick={() => encounter.quickHP(creature.id, 1)}>HP+</button>
    {/if}

    <button
      class="font-body text-[0.76rem] px-2 py-[3px] rounded-[3px] border border-border bg-surface2 text-text-dim cursor-pointer transition-all duration-[120ms] ml-auto hover:border-danger hover:text-danger"
      onclick={() => encounter.removeCreature(creature.id)}
    >✕</button>
  </div>

  {#if defeated}
    <div class="absolute inset-0 flex items-center justify-center font-mono text-[0.62rem] uppercase tracking-[4px] text-text-faint bg-black/45 rounded-[7px] pointer-events-none">Defeated</div>
  {/if}
</div>
