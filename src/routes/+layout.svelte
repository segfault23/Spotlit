<script>
  import '../app.css';
  import { theme } from '$lib/stores/theme.js';
  import { user } from '$lib/stores/user.js';
  import { encounter } from '$lib/stores/encounter.js';
  import { loadRosterFromServer } from '$lib/stores/roster.js';
  import { featuresByName, presetsByName } from '$lib/stores/catalog.js';
  import { browser } from '$app/environment';

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
  $effect(() => {
    featuresByName.set(data.featuresByName ?? {});
  });
  $effect(() => {
    presetsByName.set(data.presetsByName ?? {});
  });
</script>

{@render children()}
