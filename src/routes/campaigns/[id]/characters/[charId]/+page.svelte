<script>
  import CharacterSheet from '$lib/components/CharacterSheet.svelte';
  let { data } = $props();
</script>

<CharacterSheet
  initial={data.character}
  campaign={data.campaign}
  ownerSub={data.ownerSub}
  isGmEditing={true}
  backHref="/campaigns/{encodeURIComponent(data.campaign.id)}"
/>
