<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  onMount(() => goto('/profile?tab=campaigns', { replaceState: true }));
</script>
