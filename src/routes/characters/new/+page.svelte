<script>
  import CharacterSheet from '$lib/components/pc/CharacterSheet.svelte';
  import { page } from '$app/stores';

  let { data } = $props();

  console.log('data', data);

  // If joining a campaign, pass the campaign code through
  let campaignCode = $derived($page.url.searchParams.get('campaign') ?? null);
</script>

<CharacterSheet
  campaignCode={campaignCode}
  backHref="/characters"
/>
