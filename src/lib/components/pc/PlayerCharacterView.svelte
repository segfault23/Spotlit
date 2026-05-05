<script>
  import FeatureBlock from '../FeatureBlock.svelte';
  import AbilityCard from '../cards/AbilityCard.svelte';
  import DomainCard from '../cards/DomainCard.svelte';
  import { theme, THEMES } from '$lib/stores/theme.js';

  let {
    initial,
    loadoutCards   = [],
    ancestryData   = null,
    ancestry2Data  = null,
    communityData  = null,
    subclassTiers  = [],
  } = $props();

  // ── Identity (read-only display) ─────────────────────────────────────────────
  const name       = initial?.name      ?? '';
  const charClass  = initial?.class     ?? '';
  const subclass   = initial?.subclass  ?? '';
  const level      = initial?.level     ?? 1;
  const ancestry   = initial?.ancestry  ?? '';
  const community  = initial?.community ?? '';
  const pronouns   = initial?.pronouns  ?? '';
  const playerName = initial?.playerName ?? '';
  const evasion    = initial?.evasion   ?? 10;
  const charId     = initial?.id        ?? null;

  const traits = [
    ['Agility',   initial?.agility   ?? 0],
    ['Strength',  initial?.strength  ?? 0],
    ['Finesse',   initial?.finesse   ?? 0],
    ['Instinct',  initial?.instinct  ?? 0],
    ['Presence',  initial?.presence  ?? 0],
    ['Knowledge', initial?.knowledge ?? 0],
  ];

  const experiences = initial?.experiences ?? [];
  const thresholds  = initial?.thresholds ?? { minor: 0, major: 0, severe: 0 };
  const features    = initial?.features   ?? [];
  const items       = initial?.items      ?? [];

  // ── Mutable play-state ───────────────────────────────────────────────────────
  let maxHP      = $state(initial?.maxHP      ?? 6);
  let hp         = $state(initial?.hp         ?? maxHP);
  let maxStress  = $state(initial?.maxStress  ?? 3);
  let stress     = $state(initial?.stress     ?? 0);
  let maxHope    = $state(initial?.maxHope    ?? 5);
  let hope       = $state(initial?.hope       ?? maxHope);
  let armorSlots = $state(initial?.armorSlots ?? 0);
  let armorUsed  = $state(initial?.armorUsed  ?? 0);
  let handfuls   = $state(initial?.handfuls   ?? 0);
  let bags       = $state(initial?.bags       ?? 0);
  let chests     = $state(initial?.chests     ?? 0);
  let notes      = $state(initial?.notes      ?? '');
  let conditions = $state(initial?.conditions ?? { hidden: false, restrained: false, vulnerable: false });
  let resourceState = $state(initial?.resourceState ?? {});

  // ── UI state ─────────────────────────────────────────────────────────────────
  let activeTab  = $state('play');
  let saveStatus = $state('idle');
  let playTimer;
  let notesTimer;
  let restPopup  = $state(false);

  const TABS = [
    { id: 'play',      label: 'Play',      icon: '⚔' },
    { id: 'cards',     label: 'Cards',     icon: '✦' },
    { id: 'abilities', label: 'Abilities', icon: '◈' },
    { id: 'inventory', label: 'Inventory', icon: '⊞' },
    { id: 'info',      label: 'Info',      icon: '⊙' },
  ];

  const themeKeys = Object.keys(THEMES);

  function b64(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  function traitSign(v) { return v > 0 ? `+${v}` : `${v}`; }

  // ── Persistence ───────────────────────────────────────────────────────────────
  async function persist(body) {
    if (!charId) return;
    saveStatus = 'saving';
    try {
      const res = await fetch(`/api/characters/${b64(charId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      saveStatus = 'saved';
      setTimeout(() => { if (saveStatus === 'saved') saveStatus = 'idle'; }, 1500);
    } catch {
      saveStatus = 'error';
      setTimeout(() => { if (saveStatus === 'error') saveStatus = 'idle'; }, 3000);
    }
  }

  function touch() {
    clearTimeout(playTimer);
    playTimer = setTimeout(() =>
      persist({ hp, stress, hope, armorUsed, handfuls, bags, chests, conditions, resourceState }), 800);
  }

  function toggleCondition(cond) {
    conditions[cond] = !conditions[cond];
    touch();
  }

  function touchNotes() {
    clearTimeout(notesTimer);
    notesTimer = setTimeout(() => persist({ notes }), 1500);
  }

  // ── Resource state ────────────────────────────────────────────────────────────
  function updateResource(key, newState) {
    resourceState = { ...resourceState, [key]: newState };
    touch();
  }

  // ── Proficiency from level (Daggerheart: 1–4=1, 5–7=2, 8–10=3) ──────────────
  const proficiency = level >= 8 ? 3 : level >= 5 ? 2 : 1;

  // Spellcast trait name from active subclass tier(s)
  const spellcastTraitName = subclassTiers.find(t => t.spellcastTrait)?.spellcastTrait ?? null;

  // Trait value map for formula resolution
  const traitMap = Object.fromEntries(traits.map(([k, v]) => [k.toLowerCase(), v]));

  function resolveMax(formula) {
    if (!formula) return null;
    switch (formula.type) {
      case 'static': return formula.value ?? 0;
      case 'trait': {
        const name = formula.trait === 'spellcast_trait'
          ? (spellcastTraitName ?? 'presence')
          : formula.trait;
        const val = traitMap[name] ?? 0;
        return Math.max(val, formula.min ?? 0);
      }
      case 'computed': {
        if (formula.formula === 'level') return level;
        if (formula.formula === 'proficiency') return proficiency;
        if (formula.formula === 'sage_cards_in_loadout_and_vault') {
          const all = [...(initial?.domainLoadout ?? []), ...(initial?.domainVault ?? [])];
          return loadoutCards.filter(c => c.domain === 'Sage' && all.includes(c.name)).length;
        }
        return 0;
      }
      default: return null;
    }
  }

  // ── modifies_resource: build a map of feature name → overridden max ───────────
  // Collect all modifiers from unlocked subclass tiers
  const TIER_LEVELS = { foundation: 1, specialization: 5, mastery: 8 };
  const resourceMaxOverrides = (() => {
    const overrides = {};
    for (const tier of subclassTiers) {
      const tierLevel = TIER_LEVELS[tier.tier] ?? 1;
      if (level < tierLevel) continue;
      for (const feat of tier.features ?? []) {
        if (feat.modifies_resource) {
          overrides[feat.modifies_resource.target_feature] = feat.modifies_resource.new_max;
        }
      }
    }
    return overrides;
  })();

  // Apply any override to a resource definition before rendering
  function applyOverride(featureName, resource) {
    if (!resource) return resource;
    const override = resourceMaxOverrides[featureName];
    if (override === undefined) return resource;
    if (resource.type === 'uses') return { ...resource, max: override };
    if (resource.type === 'sub_uses') {
      return { ...resource, sub_uses: resource.sub_uses.map(s => ({ ...s, max: override })) };
    }
    return resource;
  }

  // ── Rest reset ────────────────────────────────────────────────────────────────
  function doRest(scope) {
    // scope: 'short' resets_on=rest; 'long' also resets_on=long_rest + fills token pools
    restPopup = false;
    const next = { ...resourceState };

    function resetResource(key, res) {
      if (!res || res.type === 'system_note') return;
      const resArr = Array.isArray(res) ? res : [res];
      for (const r of resArr) {
        if (r.type === 'uses') {
          const should = r.resets_on === 'rest' || (scope === 'long' && r.resets_on === 'long_rest');
          if (should) next[key] = { ...(next[key] ?? {}), used: 0 };
        } else if (r.type === 'sub_uses') {
          const sample = r.sub_uses?.[0];
          const should = sample?.resets_on === 'rest' || (scope === 'long' && sample?.resets_on === 'long_rest');
          if (should) {
            const s = {};
            for (const su of r.sub_uses ?? []) s[su.key] = 0;
            next[key] = s;
          }
        } else if (r.type === 'token_pool') {
          if (r.clear_on === 'rest' || (scope === 'long' && r.clear_on === 'long_rest')) {
            next[key] = { tokens: 0 };
          }
          if (scope === 'long' && r.fill_trigger === 'long_rest') {
            const max = resolveMax(r.max_formula) ?? 0;
            next[key] = { tokens: max };
          }
        } else if (r.type === 'binary_state') {
          if (scope === 'long' && r.clear_on === 'long_rest') next[key] = { active: false };
        } else if (r.type === 'state_tracker') {
          if (r.resets_on === 'rest' || (scope === 'long' && r.resets_on === 'long_rest')) {
            next[key] = { value: r.min ?? 0 };
          }
        }
      }
    }

    // Domain cards (card-level resource)
    for (const card of loadoutCards) {
      if (card.resource) resetResource(card.name, card.resource);
      for (const ab of card.abilities ?? []) {
        if (ab.resource) resetResource(ab.name, ab.resource);
      }
    }
    // Ancestry
    for (const anc of [ancestryData, ancestry2Data].filter(Boolean)) {
      for (const ab of anc.abilities ?? []) {
        if (ab.resource) resetResource(ab.name, ab.resource);
      }
    }
    // Community
    for (const feat of communityData?.features ?? []) {
      if (feat.resource) resetResource(feat.name, feat.resource);
    }
    // Subclass
    for (const tier of subclassTiers) {
      const tl = TIER_LEVELS[tier.tier] ?? 1;
      if (level < tl) continue;
      for (const feat of tier.features ?? []) {
        if (feat.resource) resetResource(feat.name, feat.resource);
      }
    }

    resourceState = next;
    persist({ resourceState: next });
  }

  // ── Tracker adjustments ───────────────────────────────────────────────────────
  function adjHP(d)       { hp        = Math.max(0, Math.min(maxHP,      hp        + d)); touch(); }
  function adjStress(d) {
    stress = Math.max(0, Math.min(maxStress, stress + d));
    if (stress >= maxStress) conditions.vulnerable = true;
    touch();
  }
  function adjHope(d)     { hope      = Math.max(0, Math.min(maxHope,    hope      + d)); touch(); }
  function adjArmor(d)    { armorUsed = Math.max(0, Math.min(armorSlots, armorUsed + d)); touch(); }
  function adjHandfuls(d) { handfuls  = Math.max(0, handfuls  + d); touch(); }
  function adjBags(d)     { bags      = Math.max(0, bags      + d); touch(); }
  function adjChests(d)   { chests    = Math.max(0, chests    + d); touch(); }

  function cycleTheme() {
    const idx = themeKeys.indexOf($theme);
    theme.set(themeKeys[(idx + 1) % themeKeys.length]);
  }

  // ── Derived display ───────────────────────────────────────────────────────────
  let classLine = $derived([charClass, subclass ? `(${subclass})` : null, `Lv ${level}`].filter(Boolean).join(' '));

  // Abilities for the Abilities tab: ancestry, community, subclass (level-gated)
  let abilityGroups = $derived((() => {
    const groups = [];
    const ancAbilities = [];
    for (const anc of [ancestryData, ancestry2Data].filter(Boolean)) {
      for (const ab of anc.abilities ?? []) {
        ancAbilities.push({ ...ab, _source: anc.name });
      }
    }
    if (ancAbilities.length) groups.push({ label: 'Ancestry', items: ancAbilities });

    if (communityData?.features?.length) {
      groups.push({ label: 'Community', items: communityData.features.map(f => ({ ...f, _source: communityData.name })) });
    }

    const subItems = [];
    for (const tier of subclassTiers) {
      const tl = TIER_LEVELS[tier.tier] ?? 1;
      const locked = level < tl;
      for (const feat of tier.features ?? []) {
        subItems.push({ ...feat, _source: `${tier.subclass} · ${tier.tier}`, _locked: locked, _unlockLevel: tl });
      }
    }
    if (subItems.length) groups.push({ label: subclass || 'Subclass', items: subItems });

    return groups;
  })());
</script>

<!-- ── Wrapper ──────────────────────────────────────────────────────────────── -->
<div class="pcv">

  <!-- ── Header ─────────────────────────────────────────────────────────────── -->
  <header class="pcv-header">
    <a class="back-link" href="/player">← Back</a>
    <div class="pcv-identity">
      <div class="pcv-name">{name || 'Unnamed'}</div>
      {#if classLine}<div class="pcv-class">{classLine}</div>{/if}
    </div>
    <div class="pcv-actions">
      {#if saveStatus === 'saving'}<span class="ss">…</span>
      {:else if saveStatus === 'saved'}<span class="ss ok">✓</span>
      {:else if saveStatus === 'error'}<span class="ss err">!</span>{/if}

      <!-- Rest popup trigger -->
      <div class="rest-wrap">
        <button class="rest-btn" onclick={() => (restPopup = !restPopup)} title="Rest">⛺</button>
        {#if restPopup}
          <div class="rest-popup">
            <button class="rest-choice" onclick={() => doRest('short')}>Short Rest</button>
            <button class="rest-choice" onclick={() => doRest('long')}>Long Rest</button>
          </div>
        {/if}
      </div>

      <button class="theme-btn" onclick={cycleTheme} title="Change theme"
              style="background: {THEMES[$theme]?.swatches[0] ?? '#e85f35'}">
      </button>
    </div>
  </header>

  <!-- ── Desktop tab bar ────────────────────────────────────────────────────── -->
  <nav class="tabs-top" aria-label="Character sections">
    {#each TABS as tab (tab.id)}
      <button class="tab-btn" class:active={activeTab === tab.id}
              onclick={() => (activeTab = tab.id)}>
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
      </button>
    {/each}
  </nav>

  <!-- ── Content ────────────────────────────────────────────────────────────── -->
  <main class="pcv-main">

    <!-- PLAY TAB ─────────────────────────────────────────────────────────────── -->
    {#if activeTab === 'play'}
      <div class="section-hd">Stats & Traits</div>
      <div class="stats-grid">
        {#each traits as [label, val] (label)}
          <div class="stat-card">
            <div class="stat-mod">{traitSign(val)}</div>
            <div class="stat-name">{label}</div>
          </div>
        {/each}
      </div>

      <!-- Conditions -->
      <div class="conditions-row">
        <button class="cond-btn cond-vulnerable" class:active={conditions.vulnerable}
                onclick={() => toggleCondition('vulnerable')}>
          ⚠ Vulnerable
        </button>
        <button class="cond-btn cond-hidden" class:active={conditions.hidden}
                onclick={() => toggleCondition('hidden')}>
          ◉ Hidden
        </button>
        <button class="cond-btn cond-restrained" class:active={conditions.restrained}
                onclick={() => toggleCondition('restrained')}>
          ⛓ Restrained
        </button>
      </div>

      <div class="play-grid" class:has-armor={armorSlots > 0}>
        <!-- HP -->
        <div class="tracker hp-tracker">
          <div class="t-label">HP</div>
          <div class="t-display">
            <span class="t-cur">{hp}</span>
            <span class="t-sep">/</span>
            <span class="t-max">{maxHP}</span>
          </div>
          <div class="t-btns">
            <button class="big-btn minus" onclick={() => adjHP(-1)}>−</button>
            <button class="big-btn plus hp-plus" onclick={() => adjHP(+1)}>+</button>
          </div>
        </div>

        <!-- Stress -->
        <div class="tracker stress-tracker">
          <div class="t-label">Stress</div>
          <div class="t-display">
            <span class="t-cur stress-cur">{stress}</span>
            <span class="t-sep">/</span>
            <span class="t-max">{maxStress}</span>
          </div>
          <div class="t-btns">
            <button class="big-btn minus" onclick={() => adjStress(-1)}>−</button>
            <button class="big-btn plus stress-plus" onclick={() => adjStress(+1)}>+</button>
          </div>
        </div>

        <!-- Hope -->
        <div class="tracker hope-tracker">
          <div class="t-label">Hope</div>
          <div class="t-display">
            <span class="t-cur hope-cur">{hope}</span>
            <span class="t-sep">/</span>
            <span class="t-max">{maxHope}</span>
          </div>
          <div class="t-btns">
            <button class="big-btn minus" onclick={() => adjHope(-1)}>−</button>
            <button class="big-btn plus hope-plus" onclick={() => adjHope(+1)}>+</button>
          </div>
        </div>

        <!-- Armor -->
        {#if armorSlots > 0}
          <div class="tracker armor-tracker">
            <div class="t-label">Armor Used</div>
            <div class="t-display">
              <span class="t-cur">{armorUsed}</span>
              <span class="t-sep">/</span>
              <span class="t-max">{armorSlots}</span>
            </div>
            <div class="t-btns">
              <button class="big-btn minus" onclick={() => adjArmor(-1)}>−</button>
              <button class="big-btn plus" onclick={() => adjArmor(+1)}>+</button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Damage Thresholds -->
      {#if thresholds.minor || thresholds.major || thresholds.severe}
        <div class="threshold-row">
          <div class="thresh-cell">
            <div class="thresh-lbl">Minor</div>
            <div class="thresh-val">{thresholds.minor}</div>
          </div>
          <div class="thresh-cell">
            <div class="thresh-lbl">Major</div>
            <div class="thresh-val">{thresholds.major}</div>
          </div>
          <div class="thresh-cell">
            <div class="thresh-lbl">Severe</div>
            <div class="thresh-val">{thresholds.severe}</div>
          </div>
        </div>
      {/if}

      <!-- Features (system/catalog features) -->
      {#if features.length > 0}
        <div class="section-hd play-features-hd">Features</div>
        <div class="features-list">
          {#each features as feat (feat)}
            <FeatureBlock {feat} />
          {/each}
        </div>
      {/if}

    <!-- CARDS TAB ────────────────────────────────────────────────────────────── -->
    {:else if activeTab === 'cards'}
      {#if loadoutCards.length === 0}
        <div class="empty-tab">No domain cards in loadout.</div>
      {:else}
        <div class="section-hd">Active Domain Cards</div>
        <div class="cards-list">
          {#each loadoutCards as card (card.name)}
            <DomainCard
              {card}
              mode="play"
              resourceState={resourceState}
              resolvedMax={resolveMax(card.resource?.max_formula)}
              onResourceChange={updateResource}
            />
          {/each}
        </div>
      {/if}

    <!-- ABILITIES TAB ───────────────────────────────────────────────────────── -->
    {:else if activeTab === 'abilities'}
      {#if abilityGroups.length === 0}
        <div class="empty-tab">No ancestry, community, or subclass abilities found.</div>
      {:else}
        {#each abilityGroups as group (group.label)}
          <div class="section-hd">{group.label}</div>
          <div class="abilities-list">
            {#each group.items as item (item.name)}
              {@const res = applyOverride(item.name, item.resource ?? null)}
              <div class:locked-ability={item._locked}>
                <AbilityCard
                  name={item.name}
                  text={item.text ?? item.description ?? ''}
                  source={item._source ?? ''}
                  resource={res}
                  resourceState={res ? (resourceState[item.name] ?? null) : null}
                  resolvedMax={res?.max_formula ? resolveMax(res.max_formula) : undefined}
                  onResourceChange={(s) => updateResource(item.name, s)}
                />
                {#if item._locked}
                  <div class="locked-badge">Unlocks at level {item._unlockLevel}</div>
                {/if}
              </div>
            {/each}
          </div>
        {/each}
      {/if}

    <!-- INVENTORY TAB ────────────────────────────────────────────────────────── -->
    {:else if activeTab === 'inventory'}
      <div class="currency-block">
        <div class="section-hd">Currency</div>
        <div class="currency-row">
          <div class="currency-item">
            <div class="currency-lbl">Handfuls</div>
            <div class="currency-ctrl">
              <button class="sm-btn" onclick={() => adjHandfuls(-1)}>−</button>
              <span class="currency-val">{handfuls}</span>
              <button class="sm-btn" onclick={() => adjHandfuls(+1)}>+</button>
            </div>
          </div>
          <div class="currency-item">
            <div class="currency-lbl">Bags</div>
            <div class="currency-ctrl">
              <button class="sm-btn" onclick={() => adjBags(-1)}>−</button>
              <span class="currency-val">{bags}</span>
              <button class="sm-btn" onclick={() => adjBags(+1)}>+</button>
            </div>
          </div>
          <div class="currency-item">
            <div class="currency-lbl">Chests</div>
            <div class="currency-ctrl">
              <button class="sm-btn" onclick={() => adjChests(-1)}>−</button>
              <span class="currency-val">{chests}</span>
              <button class="sm-btn" onclick={() => adjChests(+1)}>+</button>
            </div>
          </div>
        </div>
      </div>

      {#if items.length === 0}
        <div class="empty-tab">No items in inventory.</div>
      {:else}
        <div class="section-hd">Items</div>
        <div class="items-list">
          {#each items as item (item.id)}
            <div class="item-row" class:equipped={item.equipped}>
              <div class="item-info">
                <div class="item-name">{item.name}</div>
                {#if item.type}
                  <span class="item-type">{item.type}</span>
                {/if}
                {#if item.type === 'weapon' && item.trait}
                  <span class="item-detail">{item.trait}{item.range ? ` · ${item.range}` : ''}{item.damage ? ` · ${item.damage}` : ''}</span>
                {/if}
                {#if item.notes}
                  <div class="item-notes">{item.notes}</div>
                {/if}
              </div>
              <div class="item-meta">
                {#if item.quantity > 1}
                  <span class="item-qty">×{item.quantity}</span>
                {/if}
                {#if item.equipped}
                  <span class="item-equipped-badge">Equipped</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}

    <!-- INFO TAB ─────────────────────────────────────────────────────────────── -->
    {:else if activeTab === 'info'}
      <div class="info-section">
        <div class="section-hd">Identity</div>
        <div class="info-grid">
          {#if ancestry}<div class="info-row"><span class="info-lbl">Ancestry</span><span class="info-val">{ancestry}</span></div>{/if}
          {#if community}<div class="info-row"><span class="info-lbl">Community</span><span class="info-val">{community}</span></div>{/if}
          {#if pronouns}<div class="info-row"><span class="info-lbl">Pronouns</span><span class="info-val">{pronouns}</span></div>{/if}
          {#if playerName}<div class="info-row"><span class="info-lbl">Player</span><span class="info-val">{playerName}</span></div>{/if}
          <div class="info-row"><span class="info-lbl">Evasion</span><span class="info-val evasion-val">{evasion}</span></div>
        </div>
      </div>

      <div class="info-section">
        <div class="section-hd">Traits</div>
        <div class="traits-grid">
          {#each traits as [label, val] (label)}
            <div class="trait-card" class:positive={val > 0} class:negative={val < 0}>
              <div class="trait-val">{traitSign(val)}</div>
              <div class="trait-name">{label}</div>
            </div>
          {/each}
        </div>
      </div>

      {#if experiences.some(e => e.text)}
        <div class="info-section">
          <div class="section-hd">Experiences</div>
          <div class="exp-list">
            {#each experiences as exp (exp)}
              {#if exp.text}
                <div class="exp-row">
                  <span class="exp-mod">{traitSign(exp.modifier ?? 0)}</span>
                  <span class="exp-text">{exp.text}</span>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/if}

      {#if features.length > 0}
        <div class="info-section">
          <div class="section-hd">Features</div>
          <div class="features-list">
            {#each features as feat (feat)}
              <FeatureBlock {feat} />
            {/each}
          </div>
        </div>
      {/if}

      <div class="info-section">
        <div class="section-hd">Notes</div>
        <textarea
          class="notes-area"
          placeholder="Session notes, reminders, plans…"
          bind:value={notes}
          oninput={touchNotes}
        ></textarea>
      </div>
    {/if}

  </main>

  <!-- ── Mobile tab bar ─────────────────────────────────────────────────────── -->
  <nav class="tabs-bottom" aria-label="Character sections">
    {#each TABS as tab (tab.id)}
      <button class="tab-btn" class:active={activeTab === tab.id}
              onclick={() => (activeTab = tab.id)}>
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
      </button>
    {/each}
  </nav>

</div>

<style>
  /* ── Layout shell ─────────────────────────────────────────────────────────── */
  .pcv {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    background: var(--bg);
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  }

  /* ── Header ──────────────────────────────────────────────────────────────── */
  .pcv-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .back-link {
    color: var(--text-dim);
    text-decoration: none;
    font-size: 0.82rem;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .back-link:active { color: var(--text); }
  .pcv-identity { flex: 1; min-width: 0; }
  .pcv-name {
    font-family: var(--font-head);
    font-size: 1.05rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pcv-class { font-size: 0.7rem; color: var(--text-dim); margin-top: 1px; }
  .pcv-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .ss { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-dim); }
  .ss.ok  { color: #6ec38c; }
  .ss.err { color: var(--danger); }
  .theme-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid var(--border2);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    flex-shrink: 0;
  }

  /* ── Rest button & popup ─────────────────────────────────────────────────── */
  .rest-wrap { position: relative; }
  .rest-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-dim);
    font-size: 1rem;
    padding: 2px 6px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .rest-btn:active { color: var(--text); border-color: var(--border2); }
  .rest-popup {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    background: var(--surface);
    border: 1px solid var(--border2);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 50;
    min-width: 130px;
  }
  .rest-choice {
    background: none;
    border: none;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    padding: 10px 16px;
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
  }
  .rest-choice:hover { background: var(--surface2); }
  .rest-choice + .rest-choice { border-top: 1px solid var(--border); }

  /* ── Tab bars ────────────────────────────────────────────────────────────── */
  .tabs-top { display: none; }
  .tabs-bottom {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(64px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: var(--surface);
    border-top: 1px solid var(--border);
    display: flex;
    z-index: 30;
  }
  .tab-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transition: color 0.12s;
    padding: 0;
  }
  .tab-btn.active { color: var(--accent); }
  .tab-btn:active { opacity: 0.7; }
  .tab-icon  { font-size: 1.15rem; line-height: 1; }
  .tab-label {
    font-family: var(--font-mono);
    font-size: 0.52rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  /* ── Content area ────────────────────────────────────────────────────────── */
  .pcv-main { flex: 1; overflow-y: auto; padding: 16px; }

  /* ── Play tab: stats grid ────────────────────────────────────────────────── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }
  .stat-card {
    background: linear-gradient(135deg, var(--surface2), color-mix(in srgb, var(--accent) 3%, var(--surface2)));
    border: 1.5px solid var(--border);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 14px 8px;
    gap: 4px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }
  .stat-mod { font-family: var(--font-head); font-size: 1.5rem; font-weight: 700; color: var(--accent); line-height: 1; }
  .stat-name { font-family: var(--font-mono); font-size: 0.56rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); font-weight: 600; }

  /* ── Play tab: conditions row ────────────────────────────────────────────── */
  .conditions-row { display: flex; gap: 6px; margin-bottom: 14px; }
  .cond-btn {
    flex: 1;
    padding: 9px 6px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface2);
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transition: all 0.15s;
  }
  .cond-btn:active { opacity: 0.7; }
  .cond-vulnerable.active { background: color-mix(in srgb, #d64545 22%, var(--surface2)); color: #d64545; border-color: #d64545; }
  .cond-hidden.active { background: color-mix(in srgb, #6b7fcc 22%, var(--surface2)); color: #6b7fcc; border-color: #6b7fcc; }
  .cond-restrained.active { background: color-mix(in srgb, #d4a744 22%, var(--surface2)); color: #d4a744; border-color: #d4a744; }

  /* ── Play tab: tracker grid ──────────────────────────────────────────────── */
  .play-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--border);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 14px;
  }
  .tracker { background: var(--surface2); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 12px; gap: 10px; }
  .hope-tracker   { background: color-mix(in srgb, var(--accent) 6%, var(--surface2)); }
  .stress-tracker { background: color-mix(in srgb, var(--stress-on) 5%, var(--surface2)); }
  .t-label { font-family: var(--font-mono); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-dim); }
  .t-display { display: flex; align-items: baseline; gap: 3px; }
  .t-cur { font-family: var(--font-head); font-size: 2.6rem; font-weight: 700; line-height: 1; color: var(--text); }
  .hp-tracker .t-cur { color: var(--hp-on); }
  .stress-cur { color: var(--stress-on); }
  .hope-cur   { color: var(--accent); }
  .t-sep { font-size: 1.3rem; color: var(--border2); }
  .t-max { font-family: var(--font-mono); font-size: 1rem; color: var(--text-dim); }
  .t-btns { display: flex; gap: 10px; }
  .big-btn { width: 52px; height: 52px; border-radius: 50%; border: 2px solid var(--border2); background: var(--surface); color: var(--text); font-size: 1.6rem; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent; touch-action: manipulation; transition: background 0.1s, border-color 0.1s; }
  .big-btn.minus:active  { background: color-mix(in srgb, var(--danger) 20%, var(--surface)); border-color: var(--danger); }
  .hp-plus:active        { background: color-mix(in srgb, var(--hp-on) 25%, var(--surface)); border-color: var(--hp-on); }
  .stress-plus:active    { background: color-mix(in srgb, var(--stress-on) 25%, var(--surface)); border-color: var(--stress-on); }
  .hope-plus:active      { background: color-mix(in srgb, var(--accent) 30%, var(--surface)); border-color: var(--accent); }

  /* ── Threshold row ───────────────────────────────────────────────────────── */
  .threshold-row { display: flex; gap: 1px; background: var(--border); border-radius: 6px; overflow: hidden; margin-bottom: 12px; }
  .thresh-cell { flex: 1; background: var(--surface2); display: flex; flex-direction: column; align-items: center; padding: 8px 4px; gap: 3px; }
  .thresh-lbl { font-family: var(--font-mono); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); }
  .thresh-val { font-family: var(--font-head); font-size: 1.1rem; color: var(--hp-on); }

  /* ── Cards & Abilities tabs ──────────────────────────────────────────────── */
  .cards-list { display: flex; flex-direction: column; gap: 10px; }
  .abilities-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
  .locked-ability { opacity: 0.5; pointer-events: none; }
  .locked-badge {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    color: var(--text-dim);
    padding: 2px 8px;
    text-align: right;
  }

  /* ── Currency row ────────────────────────────────────────────────────────── */
  .currency-row { display: flex; gap: 8px; }
  .currency-item { flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 10px 8px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .currency-lbl { font-family: var(--font-mono); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); }
  .currency-ctrl { display: flex; align-items: center; gap: 8px; }
  .currency-val { font-family: var(--font-head); font-size: 1.4rem; min-width: 28px; text-align: center; }
  .sm-btn { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border2); background: var(--surface); color: var(--text); font-size: 1.2rem; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  .sm-btn:active { background: var(--surface3); }

  /* ── Section headings ────────────────────────────────────────────────────── */
  .section-hd { font-family: var(--font-mono); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-dim); margin-bottom: 10px; }
  .play-features-hd { margin-top: 18px; }
  .currency-block { margin-bottom: 18px; }
  .empty-tab { color: var(--text-dim); font-size: 0.9rem; text-align: center; padding: 40px 20px; }

  /* ── Features list ───────────────────────────────────────────────────────── */
  .features-list { display: flex; flex-direction: column; gap: 10px; }

  /* ── Inventory tab ───────────────────────────────────────────────────────── */
  .items-list { display: flex; flex-direction: column; gap: 1px; background: var(--border); border-radius: 6px; overflow: hidden; }
  .item-row { background: var(--surface2); display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; }
  .item-row.equipped { background: color-mix(in srgb, var(--accent) 5%, var(--surface2)); }
  .item-info { flex: 1; min-width: 0; }
  .item-name { font-size: 0.92rem; font-weight: 600; color: var(--text); }
  .item-type { display: inline-block; font-family: var(--font-mono); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.06em; background: var(--surface3); color: var(--text-dim); border-radius: 3px; padding: 1px 5px; margin-top: 3px; }
  .item-detail { display: block; font-size: 0.72rem; color: var(--text-dim); margin-top: 2px; }
  .item-notes { font-size: 0.75rem; color: var(--text-dim); margin-top: 4px; line-height: 1.4; }
  .item-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
  .item-qty { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-dim); }
  .item-equipped-badge { font-family: var(--font-mono); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; background: color-mix(in srgb, var(--accent) 15%, var(--surface2)); color: var(--accent); border: 1px solid var(--accent); border-radius: 3px; padding: 1px 5px; }

  /* ── Info tab ────────────────────────────────────────────────────────────── */
  .info-section { margin-bottom: 22px; }
  .info-grid { display: flex; flex-direction: column; gap: 2px; background: var(--border); border-radius: 6px; overflow: hidden; }
  .info-row { display: flex; align-items: center; gap: 10px; background: var(--surface2); padding: 10px 14px; }
  .info-lbl { font-family: var(--font-mono); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); width: 80px; flex-shrink: 0; }
  .info-val { font-size: 0.88rem; color: var(--text); }
  .evasion-val { font-family: var(--font-head); font-size: 1.1rem; }
  .traits-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .trait-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; display: flex; flex-direction: column; align-items: center; padding: 10px 6px; gap: 3px; }
  .trait-val { font-family: var(--font-head); font-size: 1.4rem; font-weight: 700; color: var(--text-dim); }
  .trait-card.positive .trait-val { color: var(--accent); }
  .trait-card.negative .trait-val { color: var(--danger); }
  .trait-name { font-family: var(--font-mono); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); }
  .exp-list { display: flex; flex-direction: column; gap: 2px; background: var(--border); border-radius: 6px; overflow: hidden; }
  .exp-row { display: flex; align-items: center; gap: 12px; background: var(--surface2); padding: 10px 14px; }
  .exp-mod { font-family: var(--font-head); font-size: 1rem; min-width: 28px; color: var(--accent); }
  .exp-text { font-size: 0.88rem; flex: 1; }
  .notes-area { width: 100%; min-height: 200px; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-family: var(--font-body); font-size: 0.92rem; line-height: 1.6; padding: 14px; resize: none; outline: none; box-sizing: border-box; }
  .notes-area:focus { border-color: var(--border2); }

  /* ── Desktop overrides ───────────────────────────────────────────────────── */
  @media (min-width: 641px) {
    .pcv { padding-bottom: 0; }
    .tabs-bottom { display: none; }
    .tabs-top {
      display: flex;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 0 8px;
      gap: 0;
    }
    .tabs-top .tab-btn { flex-direction: row; flex: none; gap: 7px; padding: 10px 18px; font-size: 0.85rem; border-bottom: 2px solid transparent; border-radius: 0; }
    .tabs-top .tab-btn.active { border-bottom-color: var(--accent); color: var(--accent); }
    .tabs-top .tab-icon { font-size: 0.9rem; }
    .tabs-top .tab-label { font-size: 0.78rem; text-transform: none; letter-spacing: 0; }
    .pcv-main { max-width: 780px; margin: 0 auto; width: 100%; padding: 24px 28px; }
    .stats-grid { grid-template-columns: repeat(6, 1fr); }
    .play-grid { grid-template-columns: repeat(3, 1fr); }
    .play-grid.has-armor { grid-template-columns: repeat(4, 1fr); }
    .tracker { padding: 24px 16px; }
    .t-cur { font-size: 3rem; }
    .big-btn { width: 56px; height: 56px; font-size: 1.8rem; }
    .traits-grid { grid-template-columns: repeat(6, 1fr); }
  }
</style>
