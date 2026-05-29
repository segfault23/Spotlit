<script>
  import CharacterCreationWizard from '$lib/components/pc/CharacterCreationWizard.svelte';
  let { data } = $props();
</script>

<CharacterCreationWizard
  campaign={data.campaign}
  isGmCreating={true}
  backHref="/campaigns/{data.campaign.joinCode}"
  ancestries={data.ancestries ?? []}
  communities={data.communities ?? []}
  subclasses={data.subclasses ?? []}
/>
