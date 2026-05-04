<script>
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';

  let { name = '', text = '', source = '' } = $props();

  let renderedText = $derived(
    text ? DOMPurify.sanitize(marked.parse(text)) : ''
  );
</script>

<div class="ability-card">
  <div class="ability-head">
    <span class="ability-name">{name}</span>
    {#if source}<span class="ability-source">{source}</span>{/if}
  </div>
  {#if text}
    <div class="ability-text">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html renderedText}
    </div>
  {/if}
</div>

<style>
  .ability-card { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }
  .ability-head { display: flex; align-items: center; gap: 8px; }
  .ability-name { font-weight: 600; font-size: 0.85rem; flex: 1; }
  .ability-source { font-size: 0.68rem; color: var(--text-dim); font-family: var(--font-mono); border: 1px solid var(--border); border-radius: 3px; padding: 1px 6px; flex-shrink: 0; }
  .ability-text { font-size: 0.78rem; color: var(--text-dim); line-height: 1.45; }
  .ability-text :global(p) { margin: 0; }
  .ability-text :global(ul), .ability-text :global(ol) { margin: 4px 0; padding-left: 16px; }
  .ability-text :global(li) { margin: 2px 0; }
  .ability-text :global(strong) { color: var(--text); }
  .ability-text :global(em) { font-style: italic; }
</style>
