<script>
  import '../app.css';
  import { theme } from '$lib/stores/theme.js';
  import { browser } from '$app/environment';

  let { children } = $props();

  $effect(() => {
    if (browser) {
      document.body.className = $theme ? `theme-${$theme}` : '';
    }
  });
</script>

{@render children()}
