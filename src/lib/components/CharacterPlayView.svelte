<script>
  let { initial } = $props();

  let name      = $state(initial?.name      ?? '');
  let charClass = $state(initial?.class     ?? '');
  let level     = $state(initial?.level     ?? 1);
  let charId    = $state(initial?.id        ?? null);

  let maxHP      = $state(initial?.maxHP      ?? 6);
  let hp         = $state(initial?.hp         ?? maxHP);
  let maxStress  = $state(initial?.maxStress  ?? 3);
  let stress     = $state(initial?.stress     ?? 0);
  let maxHope    = $state(initial?.maxHope    ?? 5);
  let hope       = $state(initial?.hope       ?? maxHope);
  let armorSlots = $state(initial?.armorSlots ?? 0);
  let armorUsed  = $state(initial?.armorUsed  ?? 0);

  let saveTimer;
  let saveStatus = $state('idle');

  function b64(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  async function persist() {
    if (!charId) return;
    saveStatus = 'saving';
    try {
      const res = await fetch(`/api/characters/${b64(charId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hp, stress, hope, armorUsed }),
      });
      if (!res.ok) throw new Error();
      saveStatus = 'saved';
      setTimeout(() => { if (saveStatus === 'saved') saveStatus = 'idle'; }, 1500);
    } catch {
      saveStatus = 'error';
      setTimeout(() => { if (saveStatus === 'error') saveStatus = 'idle'; }, 3000);
    }
  }

  function touch() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 800);
  }

  function adjHP(d)     { hp         = Math.max(0, Math.min(maxHP,      hp         + d)); touch(); }
  function adjStress(d) { stress     = Math.max(0, Math.min(maxStress,  stress     + d)); touch(); }
  function adjHope(d)   { hope       = Math.max(0, Math.min(maxHope,    hope       + d)); touch(); }
  function adjArmor(d)  { armorUsed  = Math.max(0, Math.min(armorSlots, armorUsed  + d)); touch(); }
</script>

<div class="play-wrap">
  <header class="play-head">
    <a class="back-link" href="/characters/{charId ? b64(charId) : ''}">← Sheet</a>
    <div class="play-identity">
      <div class="play-name">{name}</div>
      {#if charClass}<div class="play-class">{charClass} · Level {level}</div>{/if}
    </div>
    <div class="play-status">
      {#if saveStatus === 'saving'}<span class="ss">Saving…</span>
      {:else if saveStatus === 'saved'}<span class="ss ok">✓</span>
      {:else if saveStatus === 'error'}<span class="ss err">!</span>{/if}
    </div>
  </header>

  <div class="trackers">
    <!-- HP -->
    <div class="tracker">
      <div class="tracker-label">HP</div>
      <div class="tracker-display hp-display">
        <span class="tracker-cur">{hp}</span>
        <span class="tracker-sep">/</span>
        <span class="tracker-max">{maxHP}</span>
      </div>
      <div class="tracker-btns">
        <button class="big-btn minus" onclick={() => adjHP(-1)}>−</button>
        <button class="big-btn plus"  onclick={() => adjHP(+1)}>+</button>
      </div>
    </div>

    <!-- Stress -->
    <div class="tracker">
      <div class="tracker-label">Stress</div>
      <div class="tracker-display">
        <span class="tracker-cur">{stress}</span>
        <span class="tracker-sep">/</span>
        <span class="tracker-max">{maxStress}</span>
      </div>
      <div class="tracker-btns">
        <button class="big-btn minus" onclick={() => adjStress(-1)}>−</button>
        <button class="big-btn plus"  onclick={() => adjStress(+1)}>+</button>
      </div>
    </div>

    <!-- Hope -->
    <div class="tracker hope-tracker">
      <div class="tracker-label">Hope</div>
      <div class="tracker-display">
        <span class="tracker-cur hope-cur">{hope}</span>
        <span class="tracker-sep">/</span>
        <span class="tracker-max">{maxHope}</span>
      </div>
      <div class="tracker-btns">
        <button class="big-btn minus" onclick={() => adjHope(-1)}>−</button>
        <button class="big-btn plus hope-plus" onclick={() => adjHope(+1)}>+</button>
      </div>
    </div>

    <!-- Armor -->
    {#if armorSlots > 0}
      <div class="tracker">
        <div class="tracker-label">Armor Used</div>
        <div class="tracker-display">
          <span class="tracker-cur">{armorUsed}</span>
          <span class="tracker-sep">/</span>
          <span class="tracker-max">{armorSlots}</span>
        </div>
        <div class="tracker-btns">
          <button class="big-btn minus" onclick={() => adjArmor(-1)}>−</button>
          <button class="big-btn plus"  onclick={() => adjArmor(+1)}>+</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .play-wrap {
    min-height: 100dvh;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    padding: 0 0 env(safe-area-inset-bottom, 16px);
  }

  .play-head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .back-link { color: var(--text-dim); text-decoration: none; font-size: 0.85rem; flex-shrink: 0; }
  .back-link:hover { color: var(--text); }
  .play-identity { flex: 1; min-width: 0; }
  .play-name { font-family: var(--font-head); font-size: 1.1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .play-class { font-size: 0.72rem; color: var(--text-dim); }
  .play-status { flex-shrink: 0; font-family: var(--font-mono); font-size: 0.8rem; }
  .ss { color: var(--text-dim); }
  .ss.ok { color: #6ec38c; }
  .ss.err { color: var(--danger); }

  .trackers {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--border);
  }

  .tracker {
    background: var(--surface2);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    gap: 12px;
  }
  .hope-tracker { background: color-mix(in srgb, var(--accent) 6%, var(--surface2)); }

  .tracker-label {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-dim);
  }

  .tracker-display {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .tracker-cur {
    font-family: var(--font-head);
    font-size: 3rem;
    font-weight: 700;
    line-height: 1;
    color: var(--text);
  }
  .hope-cur { color: var(--accent); }
  .tracker-sep { font-size: 1.5rem; color: var(--border2); }
  .tracker-max { font-family: var(--font-mono); font-size: 1.2rem; color: var(--text-dim); }

  .tracker-btns {
    display: flex;
    gap: 12px;
  }
  .big-btn {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: 2px solid var(--border2);
    background: var(--surface);
    color: var(--text);
    font-size: 1.8rem;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s, border-color 0.1s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .big-btn.minus:active { background: color-mix(in srgb, var(--hp-on) 20%, var(--surface)); border-color: var(--hp-on); }
  .big-btn.plus:active  { background: color-mix(in srgb, var(--accent) 20%, var(--surface)); border-color: var(--accent); }
  .big-btn.hope-plus:active { background: color-mix(in srgb, var(--accent) 30%, var(--surface)); }
</style>
