<script>
  import CharacterSheet from '$lib/components/pc/CharacterSheet.svelte';
  let { data } = $props();
</script>

<CharacterSheet
  campaign={data.campaign}
  isGmCreating={true}
  backHref="/campaigns/{data.campaign.joinCode}"
  ancestries={data.ancestries ?? []}
  communities={data.communities ?? []}
  subclasses={data.subclasses ?? []}
/>
