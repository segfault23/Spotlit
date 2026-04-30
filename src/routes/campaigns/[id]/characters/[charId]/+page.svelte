<script>
  import CharacterSheet from '$lib/components/CharacterSheet.svelte';
  let { data } = $props();
</script>

<CharacterSheet
  initial={data.character}
  campaign={data.campaign}
  ownerSub={data.ownerSub}
  campaignCode={data.campaign.joinCode}
  isGmEditing={true}
  backHref="/campaigns/{data.campaign.joinCode}"
/>
