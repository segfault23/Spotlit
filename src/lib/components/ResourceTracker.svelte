<script>
  // Props:
  //   resource     – resource definition from DynamoDB (the resource field on a card/ability)
  //   state        – current tracked state from character.resourceState[key]
  //   resolvedMax  – optional computed max for token_pool/dice_pool (overrides formula)
  //   onchange     – function(newState) called when the player interacts

  let { resource, state, resolvedMax, onchange } = $props();

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function emit(newState) { onchange?.(newState); }

  // ── uses ─────────────────────────────────────────────────────────────────────
  // state: { used: N }   — N uses consumed, 0 = fully available

  function usesMax(res) { return res.max ?? 1; }
  function usesAvailable(res, st) { return usesMax(res) - (st?.used ?? 0); }

  function spendUse(res, st) {
    const used = st?.used ?? 0;
    if (used >= usesMax(res)) return;
    emit({ ...(st ?? {}), used: used + 1 });
  }
  function recoverUse(res, st) {
    const used = st?.used ?? 0;
    if (used <= 0) return;
    emit({ ...(st ?? {}), used: used - 1 });
  }

  // ── sub_uses ──────────────────────────────────────────────────────────────────
  // state: { [key]: N }  — individual use counters per sub-use entry

  function subAvailable(sub, st) { return (sub.max ?? 1) - ((st ?? {})[sub.key] ?? 0); }

  function spendSub(sub, st) {
    const cur = (st ?? {})[sub.key] ?? 0;
    if (cur >= (sub.max ?? 1)) return;
    emit({ ...(st ?? {}), [sub.key]: cur + 1 });
  }
  function recoverSub(sub, st) {
    const cur = (st ?? {})[sub.key] ?? 0;
    if (cur <= 0) return;
    emit({ ...(st ?? {}), [sub.key]: cur - 1 });
  }

  // ── token_pool / dice_pool ────────────────────────────────────────────────────
  // state: { tokens: N } or { dice: N }

  function poolField(res) { return res.type === 'dice_pool' ? 'dice' : 'tokens'; }
  function poolVal(res, st) { return (st ?? {})[poolField(res)] ?? 0; }
  function effectiveMax(res) {
    if (resolvedMax !== undefined) return resolvedMax;
    if (res.max_formula?.type === 'none') return Infinity;
    return null; // unknown until resolved at runtime
  }

  function addToken(res, st) {
    const field = poolField(res);
    const cur = (st ?? {})[field] ?? 0;
    const max = effectiveMax(res);
    if (max !== null && max !== Infinity && cur >= max) return;
    emit({ ...(st ?? {}), [field]: cur + 1 });
  }
  function removeToken(res, st) {
    const field = poolField(res);
    const cur = (st ?? {})[field] ?? 0;
    if (cur <= 0) return;
    emit({ ...(st ?? {}), [field]: cur - 1 });
  }

  // ── binary_state ──────────────────────────────────────────────────────────────
  // state: { active: bool }

  function toggleBinary(st) {
    emit({ ...(st ?? {}), active: !(st?.active ?? false) });
  }

  // ── state_tracker ─────────────────────────────────────────────────────────────
  // state: { value: N }  — ascending counter

  function trackerVal(res, st) { return (st ?? {}).value ?? (res.min ?? 0); }
  function incTracker(res, st) {
    const v = trackerVal(res, st);
    if (v >= (res.max ?? 6)) return;
    emit({ ...(st ?? {}), value: v + 1 });
  }
  function decTracker(res, st) {
    const v = trackerVal(res, st);
    if (v <= (res.min ?? 0)) return;
    emit({ ...(st ?? {}), value: v - 1 });
  }
</script>

{#if resource?.type === 'uses'}
  {@const max = usesMax(resource)}
  {@const avail = usesAvailable(resource, state)}
  <div class="rt-row">
    <div class="rt-dots">
      {#each Array.from({ length: max }, (_, i) => i) as i (i)}
        <button
          class="dot"
          class:dot-avail={i < avail}
          class:dot-spent={i >= avail}
          onclick={() => i < avail ? spendUse(resource, state) : recoverUse(resource, state)}
          title={i < avail ? 'Click to spend' : 'Click to recover'}
        ></button>
      {/each}
    </div>
    {#if resource.resets_on}
      <span class="rt-label">/ {resource.resets_on === 'long_rest' ? 'long rest' : resource.resets_on === 'session' ? 'session' : 'rest'}</span>
    {/if}
  </div>

{:else if resource?.type === 'sub_uses'}
  <div class="rt-sub-uses">
    {#each resource.sub_uses ?? [] as sub (sub.key)}
      {@const avail = subAvailable(sub, state)}
      {@const max = sub.max ?? 1}
      <div class="rt-sub-row">
        <span class="rt-sub-label">{sub.label}</span>
        <div class="rt-dots rt-dots-sm">
          {#each Array.from({ length: max }, (_, i) => i) as i (i)}
            <button
              class="dot dot-sm"
              class:dot-avail={i < avail}
              class:dot-spent={i >= avail}
              onclick={() => i < avail ? spendSub(sub, state) : recoverSub(sub, state)}
            ></button>
          {/each}
        </div>
      </div>
    {/each}
  </div>

{:else if resource?.type === 'token_pool' || resource?.type === 'dice_pool'}
  {@const val = poolVal(resource, state)}
  {@const max = effectiveMax(resource)}
  {@const isDice = resource.type === 'dice_pool'}
  <div class="rt-row">
    <button class="rt-btn" onclick={() => removeToken(resource, state)} disabled={val <= 0}>−</button>
    <span class="rt-count">
      {isDice ? '🎲' : '◆'} {val}{max !== null && max !== Infinity ? `/${max}` : ''}
    </span>
    <button class="rt-btn" onclick={() => addToken(resource, state)}
            disabled={max !== null && max !== Infinity && val >= max}>+</button>
    {#if resource.die_size}
      <span class="rt-label">{resource.die_size}s</span>
    {/if}
  </div>

{:else if resource?.type === 'binary_state'}
  {@const active = state?.active ?? false}
  <div class="rt-row">
    <button class="rt-toggle" class:rt-toggle-on={active} onclick={() => toggleBinary(state)}>
      {active ? resource.state_name ?? 'Active' : `Not ${resource.state_name ?? 'Active'}`}
    </button>
  </div>

{:else if resource?.type === 'state_tracker'}
  {@const val = trackerVal(resource, state)}
  {@const max = resource.max ?? 6}
  {@const expired = val >= max}
  <div class="rt-row">
    <button class="rt-btn" onclick={() => decTracker(resource, state)} disabled={val <= (resource.min ?? 0)}>−</button>
    <span class="rt-count" class:rt-expired={expired}>{val}/{max}</span>
    <button class="rt-btn" onclick={() => incTracker(resource, state)} disabled={expired}>+</button>
    {#if expired}<span class="rt-label rt-expired-lbl">expired</span>{/if}
  </div>
{/if}

<style>
  .rt-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  /* ── Dots ────────────────────────────────────────────────────────────────── */
  .rt-dots {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .rt-dots-sm { gap: 3px; }

  .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1.5px solid var(--border2);
    background: transparent;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: background 0.1s, border-color 0.1s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .dot-sm { width: 11px; height: 11px; }
  .dot-avail {
    background: var(--accent);
    border-color: var(--accent);
  }
  .dot-spent {
    background: transparent;
    border-color: var(--border2);
  }
  .dot:active { opacity: 0.7; }

  /* ── Sub-uses ────────────────────────────────────────────────────────────── */
  .rt-sub-uses {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .rt-sub-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .rt-sub-label {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    color: var(--text-dim);
    min-width: 100px;
  }

  /* ── Counter (token/dice/state_tracker) ──────────────────────────────────── */
  .rt-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1px solid var(--border2);
    background: var(--surface);
    color: var(--text);
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .rt-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .rt-btn:active:not(:disabled) { background: var(--surface3); }

  .rt-count {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--text);
    min-width: 36px;
    text-align: center;
  }
  .rt-expired { color: var(--text-dim); }

  /* ── Binary toggle ───────────────────────────────────────────────────────── */
  .rt-toggle {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 3px 10px;
    border-radius: 20px;
    border: 1px solid var(--border2);
    background: var(--surface2);
    color: var(--text-dim);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transition: all 0.15s;
  }
  .rt-toggle-on {
    background: color-mix(in srgb, var(--accent) 15%, var(--surface2));
    border-color: var(--accent);
    color: var(--accent);
  }
  .rt-toggle:active { opacity: 0.75; }

  /* ── Labels ──────────────────────────────────────────────────────────────── */
  .rt-label {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: var(--text-dim);
  }
  .rt-expired-lbl { color: var(--danger, #d64040); }
</style>
