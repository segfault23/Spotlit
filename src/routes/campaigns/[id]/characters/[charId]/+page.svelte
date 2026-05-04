<script>
  import CharacterSheet from '$lib/components/pc/CharacterSheet.svelte';
  let { data } = $props();
</script>

<CharacterSheet
  initial={data.character}
  campaign={data.campaign}
  ownerSub={data.ownerSub}
  campaignCode={data.campaign.joinCode}
  isGmEditing={true}
  backHref="/campaigns/{data.campaign.joinCode}"
  ancestries={data.ancestries ?? []}
  communities={data.communities ?? []}
  subclasses={data.subclasses ?? []}
/>
