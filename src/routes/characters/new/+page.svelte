<script>
  import CharacterSheet from '$lib/components/pc/CharacterSheet.svelte';
  import { page } from '$app/stores';

  let { data } = $props();

  let campaignCode = $derived($page.url.searchParams.get('campaign') ?? null);
</script>

<CharacterSheet
  campaignCode={campaignCode}
  backHref="/characters"
  ancestries={data.ancestries ?? []}
  communities={data.communities ?? []}
  subclasses={data.subclasses ?? []}
/>
