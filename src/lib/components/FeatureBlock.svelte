<script>
  import { featuresByName } from '$lib/stores/catalog.js';

  let { feat } = $props();

  let fname    = $derived(feat.split('|')[0]);
  let fnote    = $derived(feat.split('|')[1]);
  let fd       = $derived($featuresByName[fname]);
  let cls      = $derived(!fd ? 'action'
    : fd.t === 'Passive'   ? 'passive'
    : fd.t === 'Action'    ? 'action'
    : fd.t === 'Reaction'  ? 'reaction'
    : 'fear');
  let typeLabel = $derived(fd ? fd.t : 'Feature');
</script>

<div class="fblock {cls} rounded py-1.5 px-2 border">
  <div class="flex items-center gap-1.5 mb-[3px]">
    <span class="ftype font-mono text-[0.54rem] uppercase tracking-[1px] px-[5px] py-px rounded-sm font-medium">{typeLabel}</span>
    <span class="font-head text-[0.85rem] text-text">{fname}</span>
    {#if fd?.cost}
      <span class="font-mono text-[0.56rem] text-text-faint ml-auto">{fd.cost}</span>
    {/if}
  </div>
  <div class="text-[0.8rem] text-text-dim leading-[1.4]">
    {fd ? fd.tx : 'No data — add to FEATURES in tracker-data.js'}
  </div>
  {#if fnote}
    <div class="font-mono text-[0.58rem] text-accent-dim mt-0.5">{fnote}</div>
  {/if}
</div>

<style>
  .fblock.passive  { background: var(--f-passive);  border-color: #2a5070; }
  .fblock.action   { background: var(--f-action);   border-color: #5a4010; }
  .fblock.reaction { background: var(--f-reaction); border-color: #5a3010; }
  .fblock.fear     { background: var(--f-fear);     border-color: #6a1a08; }

  .fblock.passive  .ftype { color: var(--f-passive-t);  background: rgba(90,171,223,.12); }
  .fblock.action   .ftype { color: var(--f-action-t);   background: rgba(200,152,48,.12); }
  .fblock.reaction .ftype { color: var(--f-reaction-t); background: rgba(208,120,50,.12); }
  .fblock.fear     .ftype { color: var(--f-fear-t);     background: rgba(224,64,32,.12); }
</style>
