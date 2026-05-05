<script>
  import PlayerCharacterView from '$lib/components/pc/PlayerCharacterView.svelte';
  let { data } = $props();
</script>

<PlayerCharacterView
  initial={data.character}
  loadoutCards={data.loadoutCards}
  ancestryData={data.ancestryData}
  ancestry2Data={data.ancestry2Data}
  communityData={data.communityData}
  subclassTiers={data.subclassTiers}
/>
