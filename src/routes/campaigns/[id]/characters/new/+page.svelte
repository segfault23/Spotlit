<script>
  import CharacterSheet from '$lib/components/CharacterSheet.svelte';
  let { data } = $props();
</script>

<CharacterSheet
  campaign={data.campaign}
  isGmCreating={true}
  backHref="/campaigns/{data.campaign.joinCode}"
/>
