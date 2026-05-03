<script>
  import PlayerCharacterView from '$lib/components/PlayerCharacterView.svelte';
  let { data } = $props();
</script>

<PlayerCharacterView initial={data.character} />
