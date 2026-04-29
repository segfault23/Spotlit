<script>
  import DotTrack from './DotTrack.svelte';
  import FeatureBlock from './FeatureBlock.svelte';
  import { encounter } from '$lib/stores/encounter.js';

  let { creature } = $props();

  let defeated = $derived(!creature.isPC && creature.hp >= creature.maxHP);
  let expanded = $derived($encounter.expandedFeats.includes(creature.id));

  const CONDITIONS = ['Hidden', 'Restrained', 'Vulnerable'];
</script>

<div
  class="card"
  class:pc-card={creature.isPC}
  class:spotlit={creature.spotlit}
  class:defeated
>
  <!-- Top row: name + badges -->
  <div class="card-top">
    <div class="cname">{creature.name}</div>
    {#if !creature.isPC}
      <div class="badges">
        <span class="badge type">{creature.type}</span>
        <span class="badge">T{creature.tier}</span>
      </div>
    {/if}
  </div>

  <!-- HP -->
  <DotTrack type="hp" max={creature.maxHP} current={creature.hp} creatureId={creature.id} />

  <!-- Stress -->
  {#if creature.maxStr > 0}
    <DotTrack type="str" max={creature.maxStr} current={creature.str} creatureId={creature.id} />
  {/if}

  <!-- Armor (PC only) -->
  {#if creature.isPC && creature.armor > 0}
    <DotTrack type="arm" max={creature.armor} current={creature.armUsed || 0} creatureId={creature.id} showAside={false} />
  {/if}

  <!-- Quick stats -->
  {#if creature.isPC}
    <div class="qstats">
      <span class="qs">Evasion <strong>{creature.evasion}</strong></span>
    </div>
  {:else}
    <div class="qstats">
      <span class="qs">Diff <strong>{creature.diff}</strong></span>
      <span class="qs">ATK <strong>{creature.atk}</strong></span>
      {#if creature.thresh}
        <span class="qs">Thresh <strong>{creature.thresh}</strong></span>
      {/if}
    </div>
    {#if creature.atkName || creature.dmg}
      <div class="atk-line">
        <strong>{creature.atkName || 'Attack'}</strong>{creature.dmg ? ' — ' + creature.dmg : ''}
      </div>
    {/if}

    <!-- Features -->
    {#if creature.feats && creature.feats.length}
      <button
        class="feat-toggle"
        class:open={expanded}
        onclick={() => encounter.toggleFeats(creature.id)}
      >
        <span class="arrow">▶</span> Features ({creature.feats.length})
      </button>
      <div class="feat-chips">
        {#each creature.feats as feat (feat)}
          <span class="fchip">{feat.split('|')[0]}</span>
        {/each}
      </div>
      {#if expanded}
        <div class="feat-blocks">
          {#each creature.feats as feat (feat)}
            <FeatureBlock {feat} />
          {/each}
        </div>
      {/if}
    {/if}
  {/if}

  <!-- Conditions -->
  <div class="conditions">
    {#each CONDITIONS as cond (cond)}
      {@const k = cond.toLowerCase()}
      <button
        class="cond {k}"
        class:on={creature.conds[k]}
        onclick={() => encounter.toggleCond(creature.id, k)}
      >{cond}</button>
    {/each}
  </div>

  <!-- Notes -->
  <textarea
    class="notes-ta"
    placeholder="Notes…"
    value={creature.notes}
    onchange={e => encounter.setNotes(creature.id, e.currentTarget.value)}
  ></textarea>

  <!-- Footer -->
  <div class="card-foot">
    <button
      class="cf-btn spot"
      class:on={creature.spotlit}
      onclick={() => encounter.toggleSpot(creature.id)}
    >{creature.spotlit ? '★ Spotlit' : '☆ Spotlight'}</button>

    {#if !creature.isPC}
      <button class="cf-btn" onclick={() => encounter.quickHP(creature.id, -1)}>HP−</button>
      <button class="cf-btn" onclick={() => encounter.quickHP(creature.id, 1)}>HP+</button>
    {/if}

    <button class="cf-btn rm" onclick={() => encounter.removeCreature(creature.id)}>✕</button>
  </div>

  {#if defeated}
    <div class="defeated-label">Defeated</div>
  {/if}
</div>
