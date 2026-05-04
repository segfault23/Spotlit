<script>
  import PlayerCharacterView from '$lib/components/pc/PlayerCharacterView.svelte';
  let { data } = $props();
</script>

<PlayerCharacterView initial={data.character} />
