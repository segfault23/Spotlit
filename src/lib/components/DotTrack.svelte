<script>
  import { encounter } from '$lib/stores/encounter.js';

  let { type, max, current, creatureId, showAside = true } = $props();

  const LABELS = { hp: 'HP', str: 'Stress', arm: 'Armor' };

  function handleClick(i) {
    encounter.toggleDot(creatureId, type, i);
  }
</script>

<div class="stat-row">
  <span class="stat-lbl">{LABELS[type]}</span>
  <div class="dots">
    {#each Array(max) as _, i (i)}
      <div
        class="dot {type}{i < current ? ' on' : ''}"
        role="button"
        tabindex="0"
        onclick={() => handleClick(i)}
        onkeydown={(e) => e.key === 'Enter' && handleClick(i)}
      ></div>
    {/each}
  </div>
  {#if showAside && type === 'hp'}
    <span class="stat-aside">{max - current}/{max}</span>
  {:else if showAside && type === 'str'}
    <span class="stat-aside">{current}/{max}</span>
  {/if}
</div>
