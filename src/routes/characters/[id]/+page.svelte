<script>
  import CharacterSheet from '$lib/components/pc/CharacterSheet.svelte';
  let { data } = $props();
</script>

<CharacterSheet
  initial={data.character}
  backHref="/characters"
  ancestries={data.ancestries ?? []}
  communities={data.communities ?? []}
  subclasses={data.subclasses ?? []}
/>
