<script>
  import CharacterSheet from '$lib/components/pc/CharacterSheet.svelte';
  let { data } = $props();
</script>

<CharacterSheet
  campaign={data.campaign}
  isGmCreating={true}
  backHref="/campaigns/{data.campaign.joinCode}"
/>
