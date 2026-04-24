<script>
  import { FEATURES } from '$lib/data.js';

  let { feat } = $props();

  let fname    = $derived(feat.split('|')[0]);
  let fnote    = $derived(feat.split('|')[1]);
  let fd       = $derived(FEATURES[fname]);
  let cls      = $derived(!fd ? 'action'
    : fd.t === 'Passive'   ? 'passive'
    : fd.t === 'Action'    ? 'action'
    : fd.t === 'Reaction'  ? 'reaction'
    : 'fear');
  let typeLabel = $derived(fd ? fd.t : 'Feature');
</script>

<div class="fblock {cls}">
  <div class="fblock-head">
    <span class="ftype">{typeLabel}</span>
    <span class="fname">{fname}</span>
    {#if fd?.cost}
      <span class="fcost">{fd.cost}</span>
    {/if}
  </div>
  <div class="ftext">
    {fd ? fd.tx : 'No data — add to FEATURES in tracker-data.js'}
  </div>
  {#if fnote}
    <div class="fnote">{fnote}</div>
  {/if}
</div>
