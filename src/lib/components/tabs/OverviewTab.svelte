<script>
  import AbilityCard from '$lib/components/cards/AbilityCard.svelte';

  let {
    ancestry = '',
    ancestry2 = '',
    ancestryData = null,
    ancestry2Data = null,
    communityData = null,
    subclassTiers = [],
    charClass = '',
    subclass = '',
    level = 1,
    spellcastTrait = null,
  } = $props();

  const TIER_UNLOCK = { foundation: 1, specialization: 5, mastery: 8 };

  function tierUnlock(tier) {
    return TIER_UNLOCK[tier?.toLowerCase()] ?? 1;
  }

  let ability1 = $derived(ancestryData?.abilities?.[0] ?? null);
  let ability2 = $derived(
    ancestry2Data ? (ancestry2Data?.abilities?.[1] ?? null) : (ancestryData?.abilities?.[1] ?? null)
  );
</script>

<div class="overview">
  {#if ancestryData}
    <section class="ov-section">
      <div class="ov-section-head">Ancestry</div>
      {#if ability1}
        <AbilityCard name={ability1.name ?? ''} text={ability1.text ?? ability1.description ?? ''} source={ancestry} />
      {/if}
      {#if ability2}
        <AbilityCard name={ability2.name ?? ''} text={ability2.text ?? ability2.description ?? ''} source={ancestry2 || ancestry} />
      {/if}
    </section>
  {/if}

  {#if communityData}
    <section class="ov-section">
      <div class="ov-section-head">Community</div>
      {#each communityData.features ?? [] as feat}
        <AbilityCard
          name={feat.name ?? ''}
          text={feat.text ?? feat.description ?? ''}
          source={communityData.name}
        />
      {/each}
    </section>
  {/if}

  {#if subclassTiers.length > 0}
    <section class="ov-section">
      <div class="ov-section-head">{charClass} · {subclass}</div>
      {#each subclassTiers as tier}
        {@const unlock = tierUnlock(tier.tier)}
        {@const locked = level < unlock}
        <div class="ov-tier" class:locked>
          <div class="ov-tier-head">
            <span class="ov-tier-name">{tier.tier}</span>
            {#if unlock > 1}
              <span class="ov-tier-lock">{locked ? `Unlocked at level ${unlock}` : `Active (level ${unlock}+)`}</span>
            {:else}
              <span class="ov-tier-lock always">Always active</span>
            {/if}
          </div>
          {#each tier.features ?? [] as feat}
            <AbilityCard name={feat.name ?? ''} text={feat.text ?? feat.description ?? ''} />
          {/each}
        </div>
      {/each}
      {#if spellcastTrait}
        <div class="ov-spellcast">Spellcast Trait: <strong>{spellcastTrait}</strong></div>
      {/if}
    </section>
  {/if}

  {#if !ancestryData && !communityData && subclassTiers.length === 0}
    <div class="ov-empty">Select an ancestry, community, and subclass on the Identity tab to see your character overview here.</div>
  {/if}
</div>

<style>
  .overview { display: flex; flex-direction: column; gap: 16px; }
  .ov-section { display: flex; flex-direction: column; gap: 6px; }
  .ov-section-head { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); font-weight: 600; margin-bottom: 2px; }
  .ov-tier { display: flex; flex-direction: column; gap: 4px; }
  .ov-tier.locked { opacity: 0.55; }
  .ov-tier-head { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
  .ov-tier-name { font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text); font-weight: 600; }
  .ov-tier-lock { font-size: 0.68rem; color: var(--text-dim); font-style: italic; }
  .ov-tier-lock.always { color: #6ec38c; font-style: normal; }
  .ov-spellcast { font-size: 0.8rem; color: var(--text-dim); margin-top: 4px; padding: 6px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; }
  .ov-empty { color: var(--text-dim); font-style: italic; font-size: 0.82rem; line-height: 1.5; }
</style>
