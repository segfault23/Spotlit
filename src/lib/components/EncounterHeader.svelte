<script>
  import { encounter } from '$lib/stores/encounter.js';
  import { theme, THEMES } from '$lib/stores/theme.js';
  import { activeModal } from '$lib/stores/modal.js';

  let themeMenuOpen = $state(false);
  let showFlash = $state(false);
  let flashTimeout;

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
    if (confirm('Start new encounter? This will clear HP, Stress, Armor, conditions, Fear, and round. Creatures stay.')) {
      encounter.new();
    }
  }

  function handleReset() {
    if (confirm('Reset encounter? HP, Stress, Armor, conditions, Fear, and round clear. Creatures stay.')) {
      encounter.reset();
    }
  }

  function handleOutsideClick(e) {
    if (!e.target.closest('.theme-toggle-wrap')) {
      themeMenuOpen = false;
    }
  }
</script>

<svelte:window onclick={handleOutsideClick} />

<div id="header">
  <button class="hdr-btn" onclick={handleNew}>🗎 New Encounter</button>
  <input
    id="encounter-name"
    type="text"
    placeholder="Name this encounter…"
    value={$encounter.encounterName}
    oninput={e => encounter.setEncounterName(e.currentTarget.value)}
  />

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
</div>
