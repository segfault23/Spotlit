<script>
  import { goto } from '$app/navigation';
  import AbilityCard from '../cards/AbilityCard.svelte';
  import NumberStepper from '../NumberStepper.svelte';
  import SelectTile from './SelectTile.svelte';

  let {
    campaign = null,
    isGmCreating = false,
    campaignCode = null,
    backHref = '/characters',
    ancestries = [],
    communities = [],
    subclasses = [],
  } = $props();

  // ── Collected choices ─────────────────────────────────────────────────────────
  let name       = $state('');
  let playerName = $state('');
  let pronouns   = $state('');
  let charClass  = $state('');
  let subclass   = $state('');
  let ancestry   = $state('');
  let ancestry2  = $state('');
  let mixed      = $state(false);
  let community  = $state('');

  let agility   = $state(0);
  let strength  = $state(0);
  let finesse   = $state(0);
  let instinct  = $state(0);
  let presence  = $state(0);
  let knowledge = $state(0);

  // ── Wizard navigation ───────────────────────────────────────────────────────
  const STEPS = [
    { key: 'identity',  label: 'Name' },
    { key: 'class',     label: 'Class' },
    { key: 'ancestry',  label: 'Ancestry' },
    { key: 'community', label: 'Community' },
    { key: 'traits',    label: 'Traits' },
    { key: 'review',    label: 'Review' },
  ];
  let stepIndex  = $state(0);
  let maxReached = $state(0);
  let creating   = $state(false);
  let createError = $state(false);

  let step = $derived(STEPS[stepIndex].key);

  let canAdvance = $derived.by(() => {
    if (step === 'identity')  return name.trim().length > 0;
    if (step === 'class')     return !!charClass && !!subclass;
    if (step === 'ancestry')  return !!ancestry && (!mixed || !!ancestry2);
    if (step === 'community') return !!community;
    return true;
  });

  function next() {
    if (stepIndex < STEPS.length - 1 && canAdvance) {
      stepIndex += 1;
      if (stepIndex > maxReached) maxReached = stepIndex;
    }
  }
  function back() {
    if (stepIndex > 0) stepIndex -= 1;
  }
  function goToStep(i) {
    if (i <= maxReached) stepIndex = i;
  }

  // ── Derived catalogue data ────────────────────────────────────────────────────
  let sortedAncestries  = $derived([...ancestries].sort((a, b) => a.name.localeCompare(b.name)));
  let sortedCommunities = $derived([...communities].sort((a, b) => a.name.localeCompare(b.name)));

  let classes = $derived([...new Set(subclasses.map(s => s.class))].sort());
  let filteredSubclasses = $derived(
    [...new Set(subclasses.filter(s => s.class === charClass).map(s => s.subclass))].sort()
  );

  function tierOrder(tier) {
    const t = tier?.toLowerCase();
    if (t === 'foundation') return 0;
    if (t === 'specialization') return 1;
    if (t === 'mastery') return 2;
    return 3;
  }

  let foundationTier = $derived(
    subclasses
      .filter(s => s.class === charClass && s.subclass === subclass)
      .sort((a, b) => tierOrder(a.tier) - tierOrder(b.tier))[0] ?? null
  );

  let ancestryData  = $derived(ancestries.find(a => a.name === ancestry) ?? null);
  let ancestry2Data = $derived(ancestry2 ? (ancestries.find(a => a.name === ancestry2) ?? null) : null);
  let communityData = $derived(communities.find(c => c.name === community) ?? null);

  // For mixed ancestry the rules take the first ability from one ancestry and
  // the second from the other; mirror the sheet's preview behaviour.
  let ability1 = $derived(ancestryData?.abilities?.[0] ?? null);
  let ability2 = $derived(
    ancestry2Data ? (ancestry2Data?.abilities?.[1] ?? null) : (ancestryData?.abilities?.[1] ?? null)
  );

  // ── Selection handlers ──────────────────────────────────────────────────────
  function selectClass(c) {
    charClass = c;
    const subs = [...new Set(subclasses.filter(s => s.class === c).map(s => s.subclass))];
    if (!subs.includes(subclass)) subclass = '';
  }

  function toggleMixed() {
    mixed = !mixed;
    if (!mixed) ancestry2 = '';
  }

  // ── Traits: Daggerheart starting array ──────────────────────────────────────
  const SUGGESTED = { agility: 2, strength: 1, finesse: 1, instinct: 0, presence: 0, knowledge: -1 };
  function applySuggested() {
    agility = SUGGESTED.agility;
    strength = SUGGESTED.strength;
    finesse = SUGGESTED.finesse;
    instinct = SUGGESTED.instinct;
    presence = SUGGESTED.presence;
    knowledge = SUGGESTED.knowledge;
  }
  function traitSign(v) { return v > 0 ? `+${v}` : `${v}`; }

  // ── Create ──────────────────────────────────────────────────────────────────
  function b64(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  function payload() {
    return {
      name: name.trim(),
      playerName: playerName.trim(),
      pronouns: pronouns.trim(),
      class: charClass,
      subclass,
      level: 1,
      ancestry,
      ancestry2: mixed ? ancestry2 : '',
      community,
      agility: +agility, strength: +strength, finesse: +finesse,
      instinct: +instinct, presence: +presence, knowledge: +knowledge,
      ...(campaignCode ? { campaignCode, campaignGmSub: campaign?.gmSub } : {}),
    };
  }

  async function create() {
    if (creating) return;
    creating = true;
    createError = false;
    try {
      const code = campaign?.joinCode ?? campaignCode;
      const url = isGmCreating ? `/api/campaigns/${code}/characters` : '/api/characters';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload()),
      });
      if (!res.ok) throw new Error(res.status);
      if (isGmCreating) {
        goto(backHref);
        return;
      }
      const { id } = await res.json();
      // Hand off to the full tabbed sheet for fine-tuning.
      goto(`/characters/${b64(id)}`);
    } catch {
      createError = true;
      creating = false;
    }
  }
</script>

<div class="wiz-wrap">
  <!-- Top bar -->
  <div class="wiz-topbar">
    <a class="back-link" href={backHref}>← Back</a>
    <span class="wiz-title">Create a character</span>
  </div>

  <!-- Progress -->
  <ol class="wiz-progress">
    {#each STEPS as s, i (s.key)}
      <li>
        <button
          type="button"
          class="prog-step"
          class:active={i === stepIndex}
          class:done={i < stepIndex}
          disabled={i > maxReached}
          onclick={() => goToStep(i)}
        >
          <span class="prog-num">{i + 1}</span>
          <span class="prog-label">{s.label}</span>
        </button>
      </li>
    {/each}
  </ol>

  <div class="wiz-card">
    <!-- ── Step: Identity ── -->
    {#if step === 'identity'}
      <h2 class="step-title">Who is this character?</h2>
      <p class="step-hint">Start with a name. You can flesh out the rest as you go.</p>
      <div class="field-grid">
        <div class="fg span2">
          <label for="w-name">Character name</label>
          <input id="w-name" type="text" bind:value={name} placeholder="e.g. Sable Vex" />
        </div>
        <div class="fg">
          <label for="w-player">Player name</label>
          <input id="w-player" type="text" bind:value={playerName} placeholder="Your name" />
        </div>
        <div class="fg">
          <label for="w-pronouns">Pronouns</label>
          <input id="w-pronouns" type="text" bind:value={pronouns} placeholder="they/them" />
        </div>
      </div>

    <!-- ── Step: Class ── -->
    {:else if step === 'class'}
      <h2 class="step-title">Choose a class</h2>
      {#if classes.length === 0}
        <p class="step-hint">No class data is available.</p>
      {:else}
        <div class="tile-grid">
          {#each classes as c (c)}
            <SelectTile label={c} selected={charClass === c} onSelect={() => selectClass(c)} />
          {/each}
        </div>

        {#if charClass}
          <h3 class="sub-title">Subclass</h3>
          <p class="step-hint">Your subclass shapes your starting features and domains.</p>
          <div class="tile-grid">
            {#each filteredSubclasses as s (s)}
              <SelectTile label={s} selected={subclass === s} onSelect={() => (subclass = s)} />
            {/each}
          </div>

          {#if foundationTier}
            <div class="detail-panel">
              {#if foundationTier.domains?.length}
                <div class="detail-meta">
                  <span class="meta-label">Domains</span>
                  {#each foundationTier.domains as d (d)}<span class="badge">{d}</span>{/each}
                  {#if foundationTier.spellcastTrait}
                    <span class="badge dim">Spellcast: {foundationTier.spellcastTrait}</span>
                  {/if}
                </div>
              {/if}
              {#if foundationTier.features?.length}
                <div class="detail-sublabel">Foundation features</div>
                <div class="detail-cards">
                  {#each foundationTier.features as feat (feat.name)}
                    <AbilityCard name={feat.name ?? ''} text={feat.text ?? feat.description ?? ''} />
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        {/if}
      {/if}

    <!-- ── Step: Ancestry ── -->
    {:else if step === 'ancestry'}
      <h2 class="step-title">Choose an ancestry</h2>
      {#if sortedAncestries.length === 0}
        <p class="step-hint">No ancestry data is available.</p>
      {:else}
        <div class="tile-grid">
          {#each sortedAncestries as a (a.name)}
            <SelectTile
              label={a.name}
              blurb={a.description ?? ''}
              selected={ancestry === a.name}
              onSelect={() => (ancestry = a.name)}
            />
          {/each}
        </div>

        <label class="mixed-toggle">
          <input type="checkbox" checked={mixed} onchange={toggleMixed} />
          Mixed ancestry (combine two ancestries)
        </label>

        {#if mixed}
          <h3 class="sub-title">Secondary ancestry</h3>
          <p class="step-hint">You'll take the first ability from your primary ancestry and the second from this one.</p>
          <div class="tile-grid">
            {#each sortedAncestries as a (a.name)}
              <SelectTile
                label={a.name}
                blurb={a.description ?? ''}
                selected={ancestry2 === a.name}
                onSelect={() => (ancestry2 = a.name)}
              />
            {/each}
          </div>
        {/if}

        {#if ability1 || ability2}
          <div class="detail-panel">
            <div class="detail-sublabel">Ancestry abilities</div>
            <div class="detail-cards">
              {#if ability1}
                <AbilityCard name={ability1.name ?? ''} text={ability1.text ?? ability1.description ?? ''} source={ancestry} />
              {/if}
              {#if ability2}
                <AbilityCard name={ability2.name ?? ''} text={ability2.text ?? ability2.description ?? ''} source={mixed ? (ancestry2 || ancestry) : ancestry} />
              {/if}
            </div>
          </div>
        {/if}
      {/if}

    <!-- ── Step: Community ── -->
    {:else if step === 'community'}
      <h2 class="step-title">Choose a community</h2>
      {#if sortedCommunities.length === 0}
        <p class="step-hint">No community data is available.</p>
      {:else}
        <div class="tile-grid">
          {#each sortedCommunities as c (c.name)}
            <SelectTile
              label={c.name}
              blurb={c.description ?? ''}
              selected={community === c.name}
              onSelect={() => (community = c.name)}
            />
          {/each}
        </div>

        {#if communityData?.features?.length}
          <div class="detail-panel">
            <div class="detail-sublabel">Community feature</div>
            <div class="detail-cards">
              {#each communityData.features as feat (feat.name)}
                <AbilityCard name={feat.name ?? ''} text={feat.text ?? feat.description ?? ''} source={community} />
              {/each}
            </div>
          </div>
        {/if}
      {/if}

    <!-- ── Step: Traits ── -->
    {:else if step === 'traits'}
      <h2 class="step-title">Assign your traits</h2>
      <p class="step-hint">
        At level 1 the suggested array is +2, +1, +1, 0, 0, −1. Apply it and rearrange,
        or set each trait yourself.
      </p>
      <button type="button" class="btn-ghost" onclick={applySuggested}>Apply suggested array</button>
      <div class="traits-grid">
        {#each [['Agility', 'agility'], ['Strength', 'strength'], ['Finesse', 'finesse'], ['Instinct', 'instinct'], ['Presence', 'presence'], ['Knowledge', 'knowledge']] as [label, key] (key)}
          <div class="trait-field">
            <span class="trait-label">{label}</span>
            <NumberStepper
              min={-1} max={2}
              value={key === 'agility' ? agility : key === 'strength' ? strength : key === 'finesse' ? finesse : key === 'instinct' ? instinct : key === 'presence' ? presence : knowledge}
              onchange={(raw) => {
                const v = Number(raw) || 0;
                if (key === 'agility') agility = v;
                else if (key === 'strength') strength = v;
                else if (key === 'finesse') finesse = v;
                else if (key === 'instinct') instinct = v;
                else if (key === 'presence') presence = v;
                else knowledge = v;
              }}
            />
          </div>
        {/each}
      </div>

    <!-- ── Step: Review ── -->
    {:else if step === 'review'}
      <h2 class="step-title">Review</h2>
      <p class="step-hint">Create the character, then fine-tune everything (HP, equipment, domain cards) on the full sheet.</p>
      <dl class="review-list">
        <div class="review-row"><dt>Name</dt><dd>{name || '—'}{pronouns ? ` (${pronouns})` : ''}</dd></div>
        {#if playerName}<div class="review-row"><dt>Player</dt><dd>{playerName}</dd></div>{/if}
        <div class="review-row"><dt>Class</dt><dd>{charClass || '—'}{subclass ? ` · ${subclass}` : ''}</dd></div>
        <div class="review-row"><dt>Ancestry</dt><dd>{ancestry || '—'}{mixed && ancestry2 ? ` / ${ancestry2}` : ''}</dd></div>
        <div class="review-row"><dt>Community</dt><dd>{community || '—'}</dd></div>
        <div class="review-row">
          <dt>Traits</dt>
          <dd class="review-traits">
            <span>Agi {traitSign(agility)}</span><span>Str {traitSign(strength)}</span><span>Fin {traitSign(finesse)}</span>
            <span>Ins {traitSign(instinct)}</span><span>Pre {traitSign(presence)}</span><span>Kno {traitSign(knowledge)}</span>
          </dd>
        </div>
      </dl>
      {#if createError}
        <p class="create-error">Something went wrong creating the character. Please try again.</p>
      {/if}
    {/if}
  </div>

  <!-- Footer nav -->
  <div class="wiz-footer">
    <button type="button" class="btn-ghost" onclick={back} disabled={stepIndex === 0}>Back</button>
    {#if step === 'review'}
      <button type="button" class="btn-primary" onclick={create} disabled={creating || !name.trim()}>
        {creating ? 'Creating…' : 'Create character'}
      </button>
    {:else}
      <button type="button" class="btn-primary" onclick={next} disabled={!canAdvance}>Next</button>
    {/if}
  </div>
</div>

<style>
  .wiz-wrap { max-width: 860px; margin: 0 auto; padding: 16px 20px 60px; display: flex; flex-direction: column; gap: 16px; }

  .wiz-topbar { display: flex; align-items: center; gap: 12px; }
  .back-link { color: var(--text-dim); text-decoration: none; font-size: 0.85rem; }
  .back-link:hover { color: var(--text); }
  .wiz-title { font-family: var(--font-head); font-size: 1.25rem; color: var(--text); }

  /* Progress */
  .wiz-progress { display: flex; list-style: none; margin: 0; padding: 0; gap: 6px; flex-wrap: wrap; }
  .wiz-progress li { flex: 1; min-width: 80px; }
  .prog-step { width: 100%; display: flex; align-items: center; gap: 6px; background: var(--surface2); border: 1px solid var(--border); border-radius: 5px; padding: 7px 9px; cursor: pointer; color: var(--text-dim); font-family: inherit; }
  .prog-step:disabled { cursor: default; opacity: 0.6; }
  .prog-step.active { border-color: var(--accent); color: var(--text); }
  .prog-step.done { color: var(--text); }
  .prog-num { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border2); font-family: var(--font-mono); font-size: 0.7rem; flex-shrink: 0; }
  .prog-step.active .prog-num, .prog-step.done .prog-num { border-color: var(--accent); color: var(--accent); }
  .prog-label { font-size: 0.72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Card */
  .wiz-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 20px; display: flex; flex-direction: column; gap: 12px; min-height: 240px; }
  .step-title { font-family: var(--font-head); font-size: 1.2rem; color: var(--text); margin: 0; }
  .sub-title { font-family: var(--font-head); font-size: 1rem; color: var(--text); margin: 10px 0 0; }
  .step-hint { color: var(--text-dim); font-size: 0.82rem; line-height: 1.5; margin: 0; }

  /* Identity fields */
  .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .fg { display: flex; flex-direction: column; gap: 3px; }
  .fg.span2 { grid-column: span 2; }
  .fg label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); font-weight: 600; }
  .fg input { background: var(--surface); border: 1px solid var(--border); border-radius: 3px; color: var(--text); font-size: 0.9rem; padding: 6px 9px; outline: none; font-family: inherit; }
  .fg input:focus { border-color: var(--accent); }

  /* Tiles */
  .tile-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }

  /* Detail panel under a selection */
  .detail-panel { display: flex; flex-direction: column; gap: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 12px; margin-top: 4px; }
  .detail-sublabel { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); font-weight: 600; }
  .detail-cards { display: flex; flex-direction: column; gap: 6px; }
  .detail-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .meta-label { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); font-weight: 600; }
  .badge { font-family: var(--font-mono); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); border: 1px solid var(--accent); border-radius: 3px; padding: 2px 7px; }
  .badge.dim { color: var(--text-dim); border-color: var(--border); }

  .mixed-toggle { display: flex; align-items: center; gap: 7px; font-size: 0.8rem; color: var(--text-dim); cursor: pointer; }

  /* Traits */
  .traits-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .trait-field { display: flex; flex-direction: column; gap: 5px; align-items: flex-start; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 10px; }
  .trait-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); font-weight: 600; }

  /* Review */
  .review-list { display: flex; flex-direction: column; gap: 0; margin: 0; }
  .review-row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .review-row dt { width: 90px; flex-shrink: 0; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); font-weight: 600; padding-top: 2px; }
  .review-row dd { margin: 0; color: var(--text); font-size: 0.9rem; }
  .review-traits { display: flex; flex-wrap: wrap; gap: 6px 12px; font-family: var(--font-mono); font-size: 0.8rem; }
  .create-error { color: var(--danger); font-size: 0.82rem; margin: 0; }

  /* Footer + buttons */
  .wiz-footer { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .btn-ghost { background: var(--surface2); border: 1px solid var(--border); border-radius: 4px; color: var(--text-dim); font-family: inherit; font-size: 0.85rem; padding: 7px 16px; cursor: pointer; align-self: flex-start; }
  .btn-ghost:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
  .btn-ghost:disabled { opacity: 0.45; cursor: default; }
  .btn-primary { background: var(--accent-dim); border: 1px solid var(--accent); border-radius: 4px; color: #f0dfa0; font-family: var(--font-body); font-weight: 600; font-size: 0.88rem; padding: 8px 22px; cursor: pointer; transition: opacity 0.12s; }
  .btn-primary:hover:not(:disabled) { opacity: 0.85; }
  .btn-primary:disabled { opacity: 0.45; cursor: default; }

  @media (max-width: 560px) {
    .field-grid { grid-template-columns: 1fr; }
    .fg.span2 { grid-column: span 1; }
    .prog-label { display: none; }
    .wiz-progress li { min-width: 0; flex: 1; }
  }
</style>
