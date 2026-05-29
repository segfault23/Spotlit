<script>
  // A clickable selection tile used by the character-creation wizard.
  // Shows a name and an optional short description blurb (clamped to a few
  // lines); the selected state is styled with the accent colour.
  let {
    label = '',
    blurb = '',
    selected = false,
    onSelect = () => {},
  } = $props();
</script>

<button
  type="button"
  class="tile"
  class:selected
  aria-pressed={selected}
  onclick={onSelect}
>
  <span class="tile-name">{label}</span>
  {#if blurb}<span class="tile-blurb">{blurb}</span>{/if}
</button>

<style>
  .tile {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 12px;
    cursor: pointer;
    color: var(--text);
    font-family: inherit;
    transition: border-color 0.12s, background 0.12s;
  }
  .tile:hover {
    border-color: var(--accent);
  }
  .tile.selected {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  }
  .tile-name {
    font-family: var(--font-head);
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.1;
  }
  .tile-blurb {
    font-size: 0.74rem;
    color: var(--text-dim);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
