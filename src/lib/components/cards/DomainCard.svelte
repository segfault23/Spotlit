<script>
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import ResourceTracker from '../ResourceTracker.svelte';

  let {
    card,
    mode = 'picker',
    onMoveToLoadout = null,
    onMoveToVault = null,
    onRemove = null,
    loadoutFull = false,
    added = false,
    // play-mode props
    resourceState = null,      // character.resourceState scoped to this card
    onResourceChange = null,   // function(key, newState) — key = card name or ability name
    resolvedMax = undefined,   // computed token_pool max for this card if applicable
  } = $props();

  // Grimoires expand by default in play mode so spells are visible
  let expanded = $state(mode === 'play');

  function renderText(text) {
    if (!text) return '';
    return DOMPurify.sanitize(marked.parse(text));
  }
</script>

<div class="domain-card">
  <div class="dc-header">
    <span class="dc-domain">{card.domain}</span>
    <span class="dc-level">Lv {card.level}</span>
    {#if card.stressCost > 0}<span class="dc-stress">{card.stressCost}✦</span>{/if}
    <span class="dc-type">{card.type}</span>
    <span class="dc-name">{card.name}</span>
    <div class="dc-actions">
      {#if mode === 'picker'}
        {#if added}
          <span class="dc-added">Added</span>
        {:else}
          <button class="btn-xs" disabled={loadoutFull} onclick={() => onMoveToVault?.(card.name)}>+ Add</button>
        {/if}
      {/if}
      {#if mode === 'loadout'}
        <button class="btn-xs btn-dim" onclick={() => onMoveToVault?.(card.name)}>→ Vault</button>
        <button class="btn-xs btn-rm" onclick={() => onRemove?.(card.name)}>✕</button>
      {/if}
      {#if mode === 'vault'}
        <button class="btn-xs" disabled={loadoutFull} onclick={() => onMoveToLoadout?.(card.name)}>→ Active</button>
        <button class="btn-xs btn-rm" onclick={() => onRemove?.(card.name)}>✕</button>
      {/if}
      {#if card.type === 'Grimoire'}
        <button class="expand-btn" onclick={() => (expanded = !expanded)}>{expanded ? '▲' : '▼'}</button>
      {/if}
    </div>
  </div>

  {#if card.type !== 'Grimoire'}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <div class="dc-text">{@html renderText(card.text ?? '')}</div>
    {#if card.resource && mode === 'play'}
      <div class="dc-tracker">
        <ResourceTracker
          resource={card.resource}
          state={resourceState?.[card.name]}
          {resolvedMax}
          onchange={(s) => onResourceChange?.(card.name, s)}
        />
      </div>
    {/if}
  {:else if expanded}
    <div class="dc-abilities">
      {#each card.abilities ?? [] as ability (ability.name)}
        <div class="dc-sub-ability">
          <span class="dc-sub-name">{ability.name ?? ''}</span>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <span class="dc-sub-text">{@html renderText(ability.text ?? ability.description ?? '')}</span>
          {#if ability.resource && mode === 'play'}
            <div class="dc-tracker">
              <ResourceTracker
                resource={ability.resource}
                state={resourceState?.[ability.name]}
                onchange={(s) => onResourceChange?.(ability.name, s)}
              />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="dc-text dc-grimoire-hint">Grimoire — expand to view spells</div>
  {/if}
</div>

<style>
  .domain-card { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; }
  .dc-header { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .dc-domain { font-family: var(--font-mono); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); border: 1px solid var(--accent); border-radius: 3px; padding: 1px 5px; flex-shrink: 0; }
  .dc-level { font-family: var(--font-mono); font-size: 0.6rem; color: var(--text-dim); border: 1px solid var(--border); border-radius: 3px; padding: 1px 5px; flex-shrink: 0; }
  .dc-stress { font-family: var(--font-mono); font-size: 0.6rem; color: #d8a040; border: 1px solid #d8a040; border-radius: 3px; padding: 1px 5px; flex-shrink: 0; }
  .dc-type { font-family: var(--font-mono); font-size: 0.6rem; color: var(--text-dim); flex-shrink: 0; }
  .dc-name { flex: 1; font-weight: 600; font-size: 0.85rem; min-width: 80px; }
  .dc-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
  .dc-added { font-family: var(--font-mono); font-size: 0.62rem; color: #6ec38c; padding: 0 4px; }
  .dc-text { font-size: 0.78rem; color: var(--text-dim); line-height: 1.45; }
  .dc-text :global(p) { margin: 0; }
  .dc-text :global(ul), .dc-text :global(ol) { margin: 4px 0; padding-left: 16px; }
  .dc-text :global(li) { margin: 2px 0; }
  .dc-text :global(strong) { color: var(--text); }
  .dc-grimoire-hint { font-style: italic; }
  .dc-abilities { display: flex; flex-direction: column; gap: 6px; }
  .dc-sub-ability { display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; background: var(--surface2); border-radius: 3px; }
  .dc-sub-name { font-weight: 600; font-size: 0.8rem; }
  .dc-sub-text { font-size: 0.75rem; color: var(--text-dim); line-height: 1.4; }
  .dc-sub-text :global(p) { margin: 0; }
  .dc-sub-text :global(strong) { color: var(--text); }
  .dc-tracker { padding-top: 4px; }
  .btn-xs { background: var(--surface2); border: 1px solid var(--border); color: var(--text); padding: 2px 7px; border-radius: 3px; font-size: 0.72rem; cursor: pointer; font-family: inherit; white-space: nowrap; }
  .btn-xs:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
  .btn-xs:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-xs.btn-dim { color: var(--text-dim); }
  .btn-xs.btn-rm:hover { border-color: var(--danger, #d64040); color: var(--danger, #d64040); }
  .expand-btn { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 0.7rem; padding: 0 4px; }
  .expand-btn:hover { color: var(--text); }
</style>
