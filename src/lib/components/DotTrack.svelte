<script>
  import { encounter } from '$lib/stores/encounter.js';

  let { type, max, current, creatureId, showAside = true, compact = false } = $props();

  const LABELS = { hp: 'HP', str: 'Stress', arm: 'Armor' };

  function handleClick(i) {
    encounter.toggleDot(creatureId, type, i);
  }
</script>

<div class={`flex items-center gap-1.5 ${compact ? '' : 'mb-1'}`}>
  {#if !compact}
    <span class="font-mono text-[0.56rem] uppercase tracking-[1px] text-text-faint w-9 shrink-0">{LABELS[type]}</span>
  {/if}
  <div class="flex gap-0.5 flex-wrap">
    {#each Array(max) as _, i (i)}
      <div
        class={[
          compact ? 'w-3.5 h-3.5' : 'w-5 h-5',
          'border cursor-pointer shrink-0 transition-[background,border-color] duration-100',
          type === 'hp'  ? `rounded ${i < current ? 'bg-hp-on border-hp-on' : 'bg-hp-off border-hp-border'}` : '',
          type === 'str' ? `rounded-full ${i < current ? 'bg-stress-on border-stress-on' : 'bg-stress-off border-stress-border'}` : '',
          type === 'arm' ? `rounded-sm ${i < current ? 'bg-armor-on border-armor-on' : 'bg-armor-off border-armor-border'}` : '',
        ].join(' ')}
        role="button"
        tabindex="0"
        onclick={() => handleClick(i)}
        onkeydown={e => e.key === 'Enter' && handleClick(i)}
      ></div>
    {/each}
  </div>
  {#if showAside && type === 'hp'}
    <span class="font-mono text-[0.58rem] text-text-faint ml-0.5">{max - current}/{max}</span>
  {:else if showAside && type === 'str'}
    <span class="font-mono text-[0.58rem] text-text-faint ml-0.5">{current}/{max}</span>
  {/if}
</div>
