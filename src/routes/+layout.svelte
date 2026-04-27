<script>
  import '../app.css';
  import { theme } from '$lib/stores/theme.js';
  import { user } from '$lib/stores/user.js';
  import { encounter } from '$lib/stores/encounter.js';
  import { loadRosterFromServer } from '$lib/stores/roster.js';
  import { featuresByName, presetsByName } from '$lib/stores/catalog.js';
  import { browser } from '$app/environment';
  import { navigating } from '$app/stores';

  let { children, data } = $props();

  $effect(() => {
    if (browser) {
      document.body.className = $theme ? `theme-${$theme}` : '';
    }
  });

  // Sync auth state into stores; toggle encounter autosave when user changes
  $effect(() => {
    const u = data.user ?? null;
    user.set(u);
    if (browser) {
      if (u) {
        loadRosterFromServer();
        encounter.enableAutosave();
      } else {
        encounter.disableAutosave();
      }
    }
  });

  // Seed the catalog stores so any descendant route (/, /profile, ...) sees
  // the merged pre-made + custom catalogue.
  $effect(() => { featuresByName.set(data.featuresByName ?? {}); });
  $effect(() => { presetsByName.set(data.presetsByName ?? {}); });
</script>

{#if $navigating}
  <div class="nav-progress" aria-hidden="true"></div>
{/if}
{@render children()}

<style>
  .nav-progress {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    z-index: 9999;
    background: linear-gradient(90deg, transparent 0%, var(--accent, #b080ff) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: nav-sweep 1.2s linear infinite;
  }
  @keyframes nav-sweep {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>
