<script>
  import { encounter } from '$lib/stores/encounter.js';
  import { theme, THEMES } from '$lib/stores/theme.js';
  import { activeModal } from '$lib/stores/modal.js';
  import { user } from '$lib/stores/user.js';

  let themeMenuOpen      = $state(false);
  let encountersOpen     = $state(false);
  let showFlash          = $state(false);
  let showEditName       = $state(true);
  let flashTimeout;

  // Encounter list state
  let savedEncounters    = $state([]);
  let encountersLoading  = $state(false);
  let saving             = $state(false);
  let saveError          = $state('');

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
    themeMenuOpen = false;
  }

  function handleNew() {
    const msg = $user
      ? 'Start a new encounter? The current one will not be auto-saved.'
      : 'Start new encounter? HP, Stress, Armor, conditions, Fear, and round will clear.';
    if (confirm(msg)) encounter.new();
  }

  function handleReset() {
    if (confirm('Reset encounter? HP, Stress, Armor, conditions, Fear, and round clear. Creatures stay.')) {
      encounter.reset();
    }
  }

  function handleSaveName() {
    showEditName = !showEditName;
  }

  async function handleSaveToServer() {
    saveError = '';
    saving = true;
    try {
      await encounter.save();
    } catch (e) {
      saveError = e.message;
    } finally {
      saving = false;
    }
  }

  async function openEncounterList() {
    encountersOpen = !encountersOpen;
    if (encountersOpen) {
      encountersLoading = true;
      try {
        const res = await fetch('/api/encounters');
        savedEncounters = res.ok ? await res.json() : [];
      } finally {
        encountersLoading = false;
      }
    }
  }

  async function handleLoadEncounter(id) {
    try {
      await encounter.load(id);
    } catch (e) {
      alert(`Could not load encounter: ${e.message}`);
    }
    encountersOpen = false;
  }

  async function handleDeleteEncounter(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this saved encounter?')) return;
    await fetch(`/api/encounters/${encodeURIComponent(id)}`, { method: 'DELETE' });
    savedEncounters = savedEncounters.filter(enc => enc.id !== id);
  }

  function handleOutsideClick(e) {
    if (!e.target.closest('.theme-toggle-wrap')) themeMenuOpen = false;
    if (!e.target.closest('.enc-list-wrap'))     encountersOpen = false;
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
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
    readonly={!showEditName}
  />
  <button class="hdr-btn" onclick={handleSaveName}>
    {showEditName ? '✏️ Edit' : '✔ Done'}
  </button>

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

  <!-- Theme picker -->
  <div class="theme-toggle-wrap">
    <button
      class="theme-toggle-btn"
      onclick={e => { e.stopPropagation(); themeMenuOpen = !themeMenuOpen; }}
    >
      🎨 Theme
    </button>
    {#if themeMenuOpen}
      <div class="theme-menu" onclick={e => e.stopPropagation()}>
        {#each Object.entries(THEMES) as [key, themeData]}
          <div
            class="theme-item"
            class:active={$theme === key}
            role="button"
            tabindex="0"
            onclick={() => setTheme(key)}
            onkeydown={e => e.key === 'Enter' && setTheme(key)}
          >
            <div class="theme-preview">
              {#each themeData.swatches as swatch}
                <div class="theme-swatch" style="background:{swatch}"></div>
              {/each}
            </div>
            <div class="theme-name">{themeData.name}</div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <button class="hdr-btn accent" onclick={() => activeModal.set('roster')}>⊞ Roster</button>
  <button class="hdr-btn" onclick={() => activeModal.set('addPC')}>+ PC</button>
  <button class="hdr-btn" onclick={() => activeModal.set('addAdv')}>+ Adversary</button>
  <button class="hdr-btn" onclick={handleReset} style="margin-left:2px">↺ Reset</button>

  <!-- Auth & encounter persistence (only when logged in) -->
  {#if $user}
    <div class="hdr-sep"></div>

    <button class="hdr-btn" onclick={handleSaveToServer} disabled={saving}>
      {saving ? '…' : '💾 Save'}
    </button>
    {#if saveError}
      <span class="save-err" title={saveError}>⚠</span>
    {/if}

    <!-- Saved encounters dropdown -->
    <div class="enc-list-wrap">
      <button
        class="hdr-btn"
        onclick={e => { e.stopPropagation(); openEncounterList(); }}
      >
        📂 Encounters
      </button>
      {#if encountersOpen}
        <div class="enc-list-menu" onclick={e => e.stopPropagation()}>
          {#if encountersLoading}
            <div class="enc-list-item enc-dim">Loading…</div>
          {:else if savedEncounters.length === 0}
            <div class="enc-list-item enc-dim">No saved encounters yet.</div>
          {:else}
            {#each savedEncounters as enc (enc.id)}
              <div
                class="enc-list-item"
                class:active={$encounter.currentEncounterId === enc.id}
                role="button"
                tabindex="0"
                onclick={() => handleLoadEncounter(enc.id)}
                onkeydown={e => e.key === 'Enter' && handleLoadEncounter(enc.id)}
              >
                <span class="enc-list-name">{enc.name || 'Untitled'}</span>
                <span class="enc-list-date">{fmtDate(enc.updatedAt)}</span>
                <button
                  class="enc-list-del"
                  onclick={e => handleDeleteEncounter(enc.id, e)}
                  title="Delete"
                >✕</button>
              </div>
            {/each}
          {/if}
        </div>
      {/if}
    </div>

    <span class="auth-name" title={$user.email}>{$user.name}</span>
    <a class="hdr-btn" href="/auth/logout">Logout</a>
  {:else}
    <div class="hdr-sep"></div>
    <a class="hdr-btn accent" href="/auth/login">🔐 Login</a>
  {/if}
</div>

<style>
  .hdr-sep {
    width: 1px;
    height: 22px;
    background: var(--border);
    margin: 0 4px;
    flex-shrink: 0;
  }

  .auth-name {
    font-size: 0.75rem;
    color: var(--text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
    padding: 0 4px;
  }

  .save-err {
    color: var(--feat-fear);
    cursor: help;
    font-size: 0.85rem;
  }

  /* Encounter list dropdown */
  .enc-list-wrap {
    position: relative;
  }

  .enc-list-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 240px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 4px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    z-index: 100;
    overflow: hidden;
  }

  .enc-list-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    cursor: pointer;
    font-size: 0.82rem;
    transition: background 0.1s;
  }

  .enc-list-item:hover {
    background: var(--surface3, var(--surface2));
    filter: brightness(1.1);
  }

  .enc-list-item.active {
    background: color-mix(in srgb, var(--accent) 20%, var(--surface2));
  }

  .enc-list-item.enc-dim {
    color: var(--text-dim);
    cursor: default;
    font-style: italic;
  }

  .enc-list-item.enc-dim:hover {
    background: none;
    filter: none;
  }

  .enc-list-name {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .enc-list-date {
    color: var(--text-dim);
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .enc-list-del {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    padding: 0 2px;
    font-size: 0.75rem;
    line-height: 1;
    flex-shrink: 0;
    opacity: 0.5;
  }

  .enc-list-del:hover {
    opacity: 1;
    color: var(--feat-fear);
  }
</style>
