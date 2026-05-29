<script>
  import { theme, THEMES } from '$lib/stores/theme.js';
  import { user } from '$lib/stores/user.js';

  let open = $state(false);

  function toggle(e) {
    e.stopPropagation();
    open = !open;
  }

  function handleOutsideClick(e) {
    if (!e.target.closest('.psm-wrap')) open = false;
  }
</script>

<svelte:window onclick={handleOutsideClick} />

<div class="psm-wrap">
  <button class="psm-btn" class:open onclick={toggle} title="Settings">⚙</button>

  {#if open}
    <div class="psm-menu" onclick={e => e.stopPropagation()}>

      <!-- User -->
      <div class="psm-user">
        {#if $user}
          <div class="psm-user-info">
            <div class="psm-user-name">{$user.name}</div>
            <div class="psm-user-email">{$user.email}</div>
          </div>
          <a class="psm-action-btn" href="/auth/logout">Logout</a>
        {:else}
          <span class="psm-user-info"><span class="psm-user-name">Not signed in</span></span>
          <a class="psm-action-btn accent" href="/auth/login">Login</a>
        {/if}
      </div>

      {#if $user}
        <a class="psm-row" href="/profile">
          <span>👤 View Profile</span>
          <span class="psm-row-hint">Adversaries · Features →</span>
        </a>
      {/if}

      <!-- Theme -->
      <div class="psm-section">
        <h4 class="psm-h">🎨 Theme</h4>
        <div class="psm-theme-grid">
          {#each Object.entries(THEMES) as [key, themeData] (key)}
            <div
              class="psm-theme-card"
              class:active={$theme === key}
              role="button"
              tabindex="0"
              onclick={() => theme.set(key)}
              onkeydown={e => e.key === 'Enter' && theme.set(key)}
            >
              <div class="psm-swatches">
                {#each themeData.swatches as swatch (swatch)}
                  <div class="psm-swatch" style="background:{swatch}"></div>
                {/each}
              </div>
              <div class="psm-theme-name">{themeData.name}</div>
            </div>
          {/each}
        </div>
      </div>

    </div>
  {/if}
</div>

<style>
  .psm-wrap {
    position: relative;
    flex-shrink: 0;
  }

  .psm-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-dim);
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    -webkit-tap-highlight-color: transparent;
  }
  .psm-btn:hover, .psm-btn.open {
    background: var(--surface3);
    color: var(--text);
  }

  .psm-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    width: 260px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    z-index: 200;
    overflow: hidden;
  }

  /* User row */
  .psm-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
  }
  .psm-user-info {
    flex: 1;
    min-width: 0;
  }
  .psm-user-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .psm-user-email {
    font-size: 0.72rem;
    color: var(--text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 1px;
  }
  .psm-action-btn {
    display: inline-flex;
    align-items: center;
    padding: 5px 10px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 5px;
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-decoration: none;
    white-space: nowrap;
    flex-shrink: 0;
    cursor: pointer;
  }
  .psm-action-btn.accent {
    border-color: var(--accent);
    color: var(--accent);
  }
  .psm-action-btn:hover { opacity: 0.8; }

  /* Profile link row */
  .psm-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    font-size: 0.82rem;
    color: var(--text);
    text-decoration: none;
    border-bottom: 1px solid var(--border);
    transition: background 0.1s;
  }
  .psm-row:hover { background: var(--surface2); }
  .psm-row-hint {
    color: var(--text-faint);
    font-size: 0.72rem;
  }

  /* Theme section */
  .psm-section {
    padding: 10px 14px 12px;
  }
  .psm-h {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    margin: 0 0 8px;
  }
  .psm-theme-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
  }
  .psm-theme-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 8px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 5px;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
    -webkit-tap-highlight-color: transparent;
  }
  .psm-theme-card:hover { background: var(--surface3); }
  .psm-theme-card.active { border-color: var(--accent); }
  .psm-swatches {
    display: flex;
    gap: 2px;
  }
  .psm-swatch {
    flex: 1;
    height: 6px;
    border-radius: 2px;
  }
  .psm-theme-name {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: var(--text-dim);
    text-align: center;
  }
  .psm-theme-card.active .psm-theme-name { color: var(--accent); }
</style>
