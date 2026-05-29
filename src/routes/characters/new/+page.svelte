<script>
  import CharacterCreationWizard from '$lib/components/pc/CharacterCreationWizard.svelte';
  import { page } from '$app/stores';

  let { data } = $props();

  let campaignCode = $derived($page.url.searchParams.get('campaign') ?? null);
</script>

<CharacterCreationWizard
  campaignCode={campaignCode}
  backHref="/characters"
  ancestries={data.ancestries ?? []}
  communities={data.communities ?? []}
  subclasses={data.subclasses ?? []}
/>
