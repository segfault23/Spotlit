<script>
  let { data } = $props();

  function b64(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  function fmtClass(c) {
    return [c.class, c.subclass ? `(${c.subclass})` : null, `Lv ${c.level}`]
      .filter(Boolean).join(' ');
  }

  function hpColor(hp, maxHP) {
    if (!maxHP) return '';
    const pct = hp / maxHP;
    if (pct <= 0.25) return 'hp-danger';
    if (pct <= 0.5) return 'hp-warn';
    return 'hp-ok';
  }
</script>

<div class="player-page">
  <header class="player-header">
    <div class="header-title">
      <span class="wordmark">Spotlit</span>
      <span class="header-sub">Player Portal</span>
    </div>
    <a class="new-btn" href="/characters/new">+ New Character</a>
  </header>

  {#if data.characters.length === 0}
    <div class="empty-state">
      <div class="empty-icon">⚔</div>
      <div class="empty-text">No characters yet</div>
      <a class="empty-cta" href="/characters/new">Create your first character →</a>
    </div>
  {:else}
    <div class="char-list">
      {#each data.characters as char (char.id)}
        <a class="char-card" href="/player/{b64(char.id)}">
          <div class="char-avatar">
            {#if char.profilePhoto}
              <img src={char.profilePhoto} alt={char.name} />
            {:else}
              <div class="avatar-ph">{char.name?.[0]?.toUpperCase() ?? '?'}</div>
            {/if}
          </div>

          <div class="char-info">
            <div class="char-name">{char.name || 'Unnamed'}</div>
            <div class="char-class">{fmtClass(char)}</div>
            {#if char.ancestry}
              <div class="char-lineage">{[char.ancestry, char.community].filter(Boolean).join(' · ')}</div>
            {/if}
          </div>

          <div class="char-vitals">
            <div class="vital {hpColor(char.hp ?? char.maxHP, char.maxHP)}">
              <span class="vital-val">{char.hp ?? char.maxHP}/{char.maxHP}</span>
              <span class="vital-lbl">HP</span>
            </div>
            <div class="vital stress-vital">
              <span class="vital-val">{char.stress ?? 0}/{char.maxStress}</span>
              <span class="vital-lbl">Stress</span>
            </div>
            <div class="vital hope-vital">
              <span class="vital-val">{char.hope ?? char.maxHope}/{char.maxHope}</span>
              <span class="vital-lbl">Hope</span>
            </div>
          </div>

          <div class="card-arrow">›</div>
        </a>
      {/each}
    </div>
  {/if}
</div>

<style>
  .player-page {
    min-height: 100dvh;
    background: var(--bg);
    display: flex;
    flex-direction: column;
  }

  .player-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .header-title {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .wordmark {
    font-family: var(--font-head);
    font-size: 1.15rem;
    color: var(--accent);
    line-height: 1;
  }
  .header-sub {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-dim);
  }

  .new-btn {
    display: inline-flex;
    align-items: center;
    padding: 8px 14px;
    background: var(--accent);
    color: var(--bg);
    border-radius: 6px;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }
  .new-btn:active { opacity: 0.8; }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 40px 20px;
    color: var(--text-dim);
  }
  .empty-icon { font-size: 2.5rem; opacity: 0.4; }
  .empty-text { font-size: 1rem; }
  .empty-cta { color: var(--accent); text-decoration: none; font-size: 0.9rem; }
  .empty-cta:hover { text-decoration: underline; }

  .char-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: var(--border);
  }

  .char-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: var(--surface2);
    text-decoration: none;
    color: var(--text);
    min-height: 80px;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transition: background 0.1s;
  }
  .char-card:active { background: var(--surface3); }

  .char-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    border: 2px solid var(--border2);
  }
  .char-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-ph {
    width: 100%;
    height: 100%;
    background: var(--surface3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-head);
    font-size: 1.4rem;
    color: var(--text-dim);
  }

  .char-info {
    flex: 1;
    min-width: 0;
  }
  .char-name {
    font-family: var(--font-head);
    font-size: 1rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .char-class {
    font-size: 0.75rem;
    color: var(--text-dim);
    margin-top: 2px;
  }
  .char-lineage {
    font-size: 0.68rem;
    color: var(--text-faint);
  }

  .char-vitals {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  }
  .vital {
    display: flex;
    align-items: baseline;
    gap: 4px;
    justify-content: flex-end;
  }
  .vital-val {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-weight: 600;
  }
  .vital-lbl {
    font-family: var(--font-mono);
    font-size: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
  }
  .hp-ok .vital-val   { color: var(--hp-on); }
  .hp-warn .vital-val { color: color-mix(in srgb, var(--hp-on) 60%, var(--danger)); }
  .hp-danger .vital-val { color: var(--danger); }
  .stress-vital .vital-val { color: var(--stress-on); }
  .hope-vital .vital-val { color: var(--accent); }

  .card-arrow {
    font-size: 1.4rem;
    color: var(--border2);
    flex-shrink: 0;
  }

  @media (min-width: 641px) {
    .char-list {
      max-width: 700px;
      margin: 24px auto;
      background: none;
      gap: 10px;
    }
    .char-card {
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    .char-card:hover {
      background: var(--surface3);
      border-color: var(--border2);
    }
  }
</style>
