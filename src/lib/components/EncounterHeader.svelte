<script>
  import { encounter, saveStatus } from '$lib/stores/encounter.js';
  import { theme, THEMES } from '$lib/stores/theme.js';
  import { activeModal } from '$lib/stores/modal.js';
  import { user } from '$lib/stores/user.js';

  let settingsOpen   = $state(false);
  let showFlash      = $state(false);
  let flashTimeout;

  // Encounter list (loaded when settings menu is opened, while logged in)
  let savedEncounters    = $state([]);
  let encountersLoading  = $state(false);

  function handleFearToken(i) {
    const s = $encounter;
    const newFear = i < s.fear ? i : i + 1;
    encounter.adj('fear', newFear - s.fear);
  }

  function handleRoundAdj(delta) {
    const advanced = encounter.adj('round', delta);
    if (advanced) {
      showFlash = true;
      clearTimeout(flashTimeout);
      flashTimeout = setTimeout(() => (showFlash = false), 1800);
    }
  }

  function setTheme(name) {
    theme.set(name);
  }

  function handleNew() {
    const msg = $user
      ? 'Start a new encounter? Current encounter is auto-saved and will remain in your list.'
      : 'Start new encounter? HP, Stress, Armor, conditions, Fear, and round will clear.';
    if (confirm(msg)) encounter.new();
  }

  function handleReset() {
    if (confirm('Reset encounter? HP, Stress, Armor, conditions, Fear, and round clear. Creatures stay.')) {
      encounter.reset();
    }
  }

  async function loadEncounterList() {
    if (!$user) { savedEncounters = []; return; }
    encountersLoading = true;
    try {
      const res = await fetch('/api/encounters');
      savedEncounters = res.ok ? await res.json() : [];
    } finally {
      encountersLoading = false;
    }
  }

  async function toggleSettings(e) {
    e.stopPropagation();
    settingsOpen = !settingsOpen;
    if (settingsOpen && $user) await loadEncounterList();
  }

  async function handleLoadEncounter(id) {
    try {
      await encounter.load(id);
    } catch (e) {
      alert(`Could not load encounter: ${e.message}`);
    }
    settingsOpen = false;
  }

  async function handleDeleteEncounter(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this saved encounter?')) return;
    await fetch(`/api/encounters/${encodeURIComponent(id)}`, { method: 'DELETE' });
    savedEncounters = savedEncounters.filter(enc => enc.id !== id);
    // If we just deleted the encounter we're currently editing, clear its id
    if ($encounter.currentEncounterId === id) {
      encounter.new();
    }
  }

  function handleOutsideClick(e) {
    if (!e.target.closest('.settings-wrap')) settingsOpen = false;
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  let saveLabel = $derived(
    $saveStatus === 'saving' ? 'Saving…' :
    $saveStatus === 'saved'  ? '✓ Saved' :
    $saveStatus === 'error'  ? '⚠ Save failed' :
    ''
  );
</script>

<svelte:window onclick={handleOutsideClick} />

<div id="header">
  <button class="hdr-btn" onclick={handleNew}>🗎 New</button>

  <input
    id="encounter-name"
    type="text"
    placeholder="Name this encounter…"
    value={$encounter.encounterName}
    oninput={e => encounter.setEncounterName(e.currentTarget.value)}
  />

  {#if $user && saveLabel}
    <span class="save-indicator save-{$saveStatus}">{saveLabel}</span>
  {/if}

  <!-- Fear -->
  <div class="hgroup">
    <span class="hg-label" style="color:var(--fear)">Fear</span>
    <button class="icon-btn" onclick={() => encounter.adj('fear', -1)}>−</button>
    <div id="fear-tokens">
      {#each Array(12) as _, i}
        <div
          class="ft"
          class:lit={i < $encounter.fear}
          role="button"
          tabindex="0"
          onclick={() => handleFearToken(i)}
          onkeydown={e => e.key === 'Enter' && handleFearToken(i)}
        ></div>
      {/each}
    </div>
    <div class="hg-val" style="color:var(--fear)">{$encounter.fear}</div>
    <button class="icon-btn" onclick={() => encounter.adj('fear', 1)}>+</button>
  </div>

  <!-- Round -->
  <div class="hgroup">
    <span class="hg-label">Round</span>
    <button class="icon-btn" onclick={() => handleRoundAdj(-1)}>−</button>
    <div class="hg-val">{$encounter.round}</div>
    <button class="icon-btn" onclick={() => handleRoundAdj(1)}>+</button>
  </div>

  <span id="round-flash" class:show={showFlash}>— spotlights cleared —</span>

  <button class="hdr-btn accent" onclick={() => activeModal.set('roster')}>⊞ Roster</button>
  <button class="hdr-btn" onclick={() => activeModal.set('addPC')}>+ PC</button>
  <button class="hdr-btn" onclick={() => activeModal.set('addAdv')}>+ Adversary</button>
  <button class="hdr-btn" onclick={handleReset} style="margin-left:2px">↺ Reset</button>

  <!-- Single settings menu: user / encounters / theme -->
  <div class="settings-wrap">
    <button
      class="hdr-btn settings-btn"
      class:open={settingsOpen}
      onclick={toggleSettings}
      title="Settings"
    >⚙</button>

    {#if settingsOpen}
      <div class="settings-menu" onclick={e => e.stopPropagation()}>

        <!-- Top: user / sign-in -->
        <div class="settings-user">
          {#if $user}
            <div class="settings-user-info">
              <div class="settings-user-name">{$user.name}</div>
              <div class="settings-user-email">{$user.email}</div>
            </div>
            <a class="hdr-btn settings-logout" href="/auth/logout">Logout</a>
          {:else}
            <span class="settings-user-info settings-user-name">Not signed in</span>
            <a class="hdr-btn accent" href="/auth/login">🔐 Login</a>
          {/if}
        </div>

        <!-- Profile link (logged-in only) -->
        {#if $user}
          <a class="settings-row" href="/profile">
            <span>👤 View Profile</span>
            <span class="settings-row-arrow">Encounters · Adversaries · Features →</span>
          </a>
        {/if}

        <!-- Encounters (logged-in only) -->
        {#if $user}
          <div class="settings-section">
            <h4 class="settings-h">📂 My Encounters</h4>
            {#if encountersLoading}
              <div class="settings-empty">Loading…</div>
            {:else if savedEncounters.length === 0}
              <div class="settings-empty">No saved encounters yet — start one and it'll auto-save here.</div>
            {:else}
              <div class="enc-list">
                {#each savedEncounters as enc (enc.id)}
                  <div
                    class="enc-row"
                    class:active={$encounter.currentEncounterId === enc.id}
                    role="button"
                    tabindex="0"
                    onclick={() => handleLoadEncounter(enc.id)}
                    onkeydown={e => e.key === 'Enter' && handleLoadEncounter(enc.id)}
                  >
                    <span class="enc-name">{enc.name || 'Untitled'}</span>
                    <span class="enc-date">{fmtDate(enc.updatedAt)}</span>
                    <button
                      class="enc-del"
                      onclick={e => handleDeleteEncounter(enc.id, e)}
                      title="Delete"
                    >✕</button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Theme -->
        <div class="settings-section">
          <h4 class="settings-h">🎨 Theme</h4>
          <div class="theme-grid">
            {#each Object.entries(THEMES) as [key, themeData]}
              <div
                class="theme-card"
                class:active={$theme === key}
                role="button"
                tabindex="0"
                onclick={() => setTheme(key)}
                onkeydown={e => e.key === 'Enter' && setTheme(key)}
              >
                <div class="theme-swatches">
                  {#each themeData.swatches as swatch}
                    <div class="theme-swatch" style="background:{swatch}"></div>
                  {/each}
                </div>
                <div class="theme-card-name">{themeData.name}</div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* save-status indicator inline next to name */
  .save-indicator {
    font-size: 0.72rem;
    font-family: var(--font-mono);
    color: var(--text-dim);
    white-space: nowrap;
    padding: 2px 6px;
    border-radius: 3px;
    transition: opacity 0.2s;
  }
  .save-indicator.save-saving { color: var(--text-dim); }
  .save-indicator.save-saved  { color: var(--accent, #6ec38c); }
  .save-indicator.save-error  { color: var(--feat-fear); background: color-mix(in srgb, var(--feat-fear) 15%, transparent); }

  /* settings menu trigger */
  .settings-btn {
    font-size: 1rem;
    line-height: 1;
    padding: 6px 10px;
  }
  .settings-btn.open {
    background: var(--surface2);
    filter: brightness(1.15);
  }

  .settings-wrap {
    position: relative;
  }

  .settings-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    width: 360px;
    max-height: calc(100vh - 80px);
    overflow-y: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    z-index: 1000;
    padding: 0;
  }

  .settings-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: var(--surface2);
    border-bottom: 1px solid var(--border);
  }
  .settings-user-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .settings-user-name {
    font-weight: 600;
    font-size: 0.85rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .settings-user-email {
    font-size: 0.72rem;
    color: var(--text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .settings-logout {
    flex-shrink: 0;
    font-size: 0.78rem;
    padding: 4px 10px;
  }

  .settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 14px;
    color: var(--text);
    text-decoration: none;
    border-bottom: 1px solid var(--border);
    font-size: 0.85rem;
    transition: background 0.1s;
  }
  .settings-row:hover {
    background: var(--surface2);
  }
  .settings-row-arrow {
    color: var(--text-dim);
    font-size: 0.7rem;
  }

  .settings-section {
    padding: 10px 14px 12px;
    border-bottom: 1px solid var(--border);
  }
  .settings-section:last-child {
    border-bottom: none;
  }
  .settings-h {
    margin: 0 0 8px;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    font-weight: 700;
  }
  .settings-empty {
    color: var(--text-dim);
    font-size: 0.78rem;
    font-style: italic;
    padding: 4px 0;
  }

  /* encounter list */
  .enc-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 220px;
    overflow-y: auto;
  }
  .enc-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.82rem;
    transition: background 0.1s;
  }
  .enc-row:hover {
    background: var(--surface2);
  }
  .enc-row.active {
    background: color-mix(in srgb, var(--accent, #7c6fcd) 22%, var(--surface2));
  }
  .enc-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .enc-date {
    color: var(--text-dim);
    font-size: 0.7rem;
    flex-shrink: 0;
  }
  .enc-del {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 0 4px;
    font-size: 0.75rem;
    opacity: 0.4;
    flex-shrink: 0;
    line-height: 1;
  }
  .enc-row:hover .enc-del {
    opacity: 0.8;
  }
  .enc-del:hover {
    opacity: 1 !important;
    color: var(--feat-fear);
  }

  /* theme grid */
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
  .theme-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 3px;
    cursor: pointer;
    background: var(--surface2);
    transition: filter 0.1s, border-color 0.1s;
    font-size: 0.78rem;
  }
  .theme-card:hover {
    filter: brightness(1.12);
  }
  .theme-card.active {
    border-color: var(--accent, #7c6fcd);
    background: color-mix(in srgb, var(--accent, #7c6fcd) 15%, var(--surface2));
  }
  .theme-swatches {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }
  .theme-swatch {
    width: 10px;
    height: 18px;
    border-radius: 2px;
  }
  .theme-card-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* responsive: pin menu to viewport on narrow screens */
  @media (max-width: 600px) {
    .settings-menu {
      position: fixed;
      top: 60px;
      right: 8px;
      left: 8px;
      width: auto;
    }
  }
</style>
