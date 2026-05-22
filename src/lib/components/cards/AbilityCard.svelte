<script>
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import ResourceTracker from '../ResourceTracker.svelte';

  let { name = '', text = '', source = '', resource = null, resourceState = null, resolvedMax = undefined, onResourceChange = null } = $props();

  let renderedText = $derived(
    text ? DOMPurify.sanitize(marked.parse(text)) : ''
  );
</script>

<div class="bg-surface border border-border rounded py-2 px-2.5 flex flex-col gap-1">
  <div class="flex items-center gap-2">
    <span class="font-semibold text-[0.85rem] flex-1">{name}</span>
    {#if source}
      <span class="text-[0.68rem] text-text-dim font-mono border border-border rounded-[3px] px-1.5 py-px shrink-0">{source}</span>
    {/if}
  </div>
  {#if text}
    <div class="ability-text text-[0.78rem] text-text-dim leading-[1.45]">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html renderedText}
    </div>
  {/if}
  {#if resource && resource.type !== 'system_note'}
    <div class="pt-0.5">
      <ResourceTracker {resource} state={resourceState} {resolvedMax} onchange={onResourceChange} />
    </div>
  {/if}
</div>

<style>
  /* :global() rules target markdown-rendered HTML injected via {@html} */
  .ability-text :global(p) { margin: 0; }
  .ability-text :global(ul), .ability-text :global(ol) { margin: 4px 0; padding-left: 16px; }
  .ability-text :global(li) { margin: 2px 0; }
  .ability-text :global(strong) { color: var(--text); }
  .ability-text :global(em) { font-style: italic; }
</style>
