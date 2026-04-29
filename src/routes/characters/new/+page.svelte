<script>
  import CharacterSheet from '$lib/components/CharacterSheet.svelte';
  import { page } from '$app/stores';

  // If joining a campaign, pass the campaign code through
  let campaignCode = $derived($page.url.searchParams.get('campaign') ?? null);
</script>

<CharacterSheet
  campaignCode={campaignCode}
  backHref="/characters"
/>
