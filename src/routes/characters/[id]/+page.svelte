<script>
  import CharacterSheet from '$lib/components/CharacterSheet.svelte';
  let { data } = $props();
</script>

<CharacterSheet initial={data.character} backHref="/characters" />
