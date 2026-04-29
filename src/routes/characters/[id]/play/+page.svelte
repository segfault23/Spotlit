<script>
  import CharacterPlayView from '$lib/components/CharacterPlayView.svelte';
  let { data } = $props();
</script>

<CharacterPlayView initial={data.character} />
