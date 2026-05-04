<script>
  import CharacterSheet from '$lib/components/pc/CharacterSheet.svelte';
  let { data } = $props();
</script>

<CharacterSheet initial={data.character} backHref="/characters" />
