<script>
  // A themed replacement for the native number-input spinner.
  // Renders − / + buttons flanking a centered number field.
  // Supports two-way binding (`bind:value`) and an optional `onchange`
  // callback that fires with the new value after typing or stepping.
  let {
    value = $bindable(0),
    min,
    max,
    step = 1,
    id = undefined,
    ariaLabel = undefined,
    size = 'md', // 'md' | 'sm'
    onchange = undefined,
  } = $props();

  function clamp(v) {
    if (typeof min === 'number' && v < min) v = min;
    if (typeof max === 'number' && v > max) v = max;
    return v;
  }

  function bump(dir) {
    const base = Number(value);
    value = clamp((Number.isFinite(base) ? base : 0) + dir * step);
    onchange?.(value);
  }
</script>

<div class="ns ns-{size}">
  <button type="button" class="ns-btn" tabindex="-1" aria-label="Decrease" onclick={() => bump(-1)}>−</button>
  <input
    {id}
    type="number"
    {min}
    {max}
    {step}
    inputmode="numeric"
    aria-label={ariaLabel}
    bind:value
    oninput={() => onchange?.(value)}
  />
  <button type="button" class="ns-btn" tabindex="-1" aria-label="Increase" onclick={() => bump(1)}>+</button>
</div>

<style>
  .ns {
    display: inline-flex;
    align-items: stretch;
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    overflow: hidden;
  }
  .ns:focus-within {
    border-color: var(--accent);
  }
  .ns input {
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-family: inherit;
    font-size: 0.88rem;
    text-align: center;
    padding: 5px 4px;
  }
  .ns-btn {
    flex: 0 0 auto;
    width: 1.9rem;
    background: transparent;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 1rem;
    line-height: 1;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background 0.12s ease,
      color 0.12s ease;
  }
  .ns-btn:hover {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--text);
  }
  .ns-btn:active {
    background: color-mix(in srgb, var(--accent) 32%, transparent);
  }
  .ns-btn:first-child {
    border-right: 1px solid var(--border);
  }
  .ns-btn:last-child {
    border-left: 1px solid var(--border);
  }

  /* Compact variant for tight rows (e.g. the experience modifier). */
  .ns-sm {
    width: auto;
  }
  .ns-sm input {
    font-size: 0.9rem;
    padding: 3px 2px;
    width: 2.3rem;
  }
  .ns-sm .ns-btn {
    width: 1.4rem;
    font-size: 0.9rem;
  }
</style>
