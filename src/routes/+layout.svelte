<script>
  import '../app.css';
  import { theme } from '$lib/stores/theme.js';
  import { user } from '$lib/stores/user.js';
  import { loadRosterFromServer } from '$lib/stores/roster.js';
  import { browser } from '$app/environment';

  let { children, data } = $props();

  $effect(() => {
    if (browser) {
      document.body.className = $theme ? `theme-${$theme}` : '';
    }
  });

  // Sync auth state into the user store and load server-side roster when logged in
  $effect(() => {
    const u = data.user ?? null;
    user.set(u);
    if (browser && u) {
      loadRosterFromServer();
    }
  });
</script>

{@render children()}
