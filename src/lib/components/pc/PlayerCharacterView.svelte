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
  const ancestry2  = initial?.ancestry2 ?? '';
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
  let activeTab  = $state('cards');
  let saveStatus = $state('idle');
  let playTimer;
  let notesTimer;
  let restPopup  = $state(false);

  const TABS = [
    { id: 'cards',     label: 'Cards',     icon: '✦' },
    { id: 'overview',  label: 'Overview',  icon: '◈' },
    { id: 'inventory', label: 'Inventory', icon: '⊞' },
    { id: 'notes',     label: 'Notes',     icon: '✎' },
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

  // ── Proficiency from level ────────────────────────────────────────────────────
  const proficiency = level >= 8 ? 3 : level >= 5 ? 2 : 1;

  const spellcastTraitName = subclassTiers.find(t => t.spellcastTrait)?.spellcastTrait ?? null;
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

  // ── modifies_resource overrides ───────────────────────────────────────────────
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

    for (const card of loadoutCards) {
      if (card.resource) resetResource(card.name, card.resource);
      for (const ab of card.abilities ?? []) {
        if (ab.resource) resetResource(ab.name, ab.resource);
      }
    }
    for (const anc of [ancestryData, ancestry2Data].filter(Boolean)) {
      for (const ab of anc.abilities ?? []) {
        if (ab.resource) resetResource(ab.name, ab.resource);
      }
    }
    for (const feat of communityData?.features ?? []) {
      if (feat.resource) resetResource(feat.name, feat.resource);
    }
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

  // ── Dot-track setters (click to set exact value) ──────────────────────────────
  function setHP(i)     { hp        = i < hp        ? i : i + 1; touch(); }
  function setStress(i) {
    stress = i < stress ? i : i + 1;
    if (stress >= maxStress) conditions.vulnerable = true;
    touch();
  }
  function setHope(i)   { hope      = i < hope      ? i : i + 1; touch(); }
  function setArmor(i)  { armorUsed = i < armorUsed ? i : i + 1; touch(); }

  function adjHandfuls(d) { handfuls = Math.max(0, handfuls + d); touch(); }
  function adjBags(d)     { bags     = Math.max(0, bags     + d); touch(); }
  function adjChests(d)   { chests   = Math.max(0, chests   + d); touch(); }

  function cycleTheme() {
    const idx = themeKeys.indexOf($theme);
    theme.set(themeKeys[(idx + 1) % themeKeys.length]);
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  let classLine = $derived(
    [charClass, subclass ? `(${subclass})` : null, `Lv ${level}`].filter(Boolean).join(' ')
  );

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

  const hasThresholds = thresholds.minor || thresholds.major || thresholds.severe;
</script>

<div class="pcv">

  <!-- ── Sticky header ─────────────────────────────────────────────────────── -->
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

      <div class="rest-wrap">
        <button class="icon-btn" onclick={() => (restPopup = !restPopup)} title="Rest">⛺</button>
        {#if restPopup}
          <div class="rest-popup">
            <button class="rest-choice" onclick={() => doRest('short')}>Short Rest</button>
            <button class="rest-choice" onclick={() => doRest('long')}>Long Rest</button>
          </div>
        {/if}
      </div>

      {#if charId}
        <a class="icon-btn edit-link" href="/characters/{b64(charId)}" title="Edit character">✎</a>
      {/if}

      <button class="theme-btn" onclick={cycleTheme} title="Change theme"
              style="background: {THEMES[$theme]?.swatches[0] ?? '#e85f35'}">
      </button>
    </div>
  </header>

  <!-- ── Hero band ─────────────────────────────────────────────────────────── -->
  <div class="pcv-hero">
    <div class="hero-avatar">
      <div class="avatar-ph">{name?.[0]?.toUpperCase() ?? '?'}</div>
    </div>
    <div class="hero-identity">
      <div class="hero-badges">
        {#if charClass}<span class="hero-badge">{charClass}{subclass ? ` · ${subclass}` : ''}</span>{/if}
        {#if level}<span class="hero-badge dim">Level {level}</span>{/if}
        {#if ancestry}<span class="hero-badge dim">{ancestry}{ancestry2 ? ` / ${ancestry2}` : ''}</span>{/if}
        {#if community}<span class="hero-badge dim">{community}</span>{/if}
      </div>
      {#if playerName}<div class="hero-player">Played by {playerName}</div>{/if}
    </div>
  </div>

  <!-- ── Body: sidebar + content ───────────────────────────────────────────── -->
  <div class="pcv-body">

    <!-- LEFT SIDEBAR ──────────────────────────────────────────────────────── -->
    <aside class="pcv-sidebar">

      <div class="sidebar-label">Traits</div>
      <div class="traits-grid">
        {#each traits as [label, val] (label)}
          <div class="trait-card" class:positive={val > 0} class:negative={val < 0}>
            <div class="trait-val">{traitSign(val)}</div>
            <div class="trait-name">{label}</div>
          </div>
        {/each}
      </div>

      <div class="sidebar-label" style="margin-top:12px">Evasion</div>
      <div class="evasion-badge">{evasion}</div>

      <div class="sidebar-label" style="margin-top:14px">Resources</div>
      <div class="res-list">

        <!-- HP -->
        <div class="res-block">
          <div class="res-head">
            <span class="res-lbl">HP</span>
            <span class="res-frac">{hp} / {maxHP}</span>
          </div>
          <div class="dot-track">
            {#each Array.from({length: maxHP}, (_, i) => i) as i (i)}
              <button class="dot hp-dot {i < hp ? 'filled' : ''}" onclick={() => setHP(i)}></button>
            {/each}
          </div>
        </div>

        <!-- Stress -->
        <div class="res-block">
          <div class="res-head">
            <span class="res-lbl">Stress</span>
            <span class="res-frac">{stress} / {maxStress}</span>
          </div>
          <div class="dot-track">
            {#each Array.from({length: maxStress}, (_, i) => i) as i (i)}
              <button class="dot stress-dot {i < stress ? 'filled' : ''}" onclick={() => setStress(i)}></button>
            {/each}
          </div>
        </div>

        <!-- Hope -->
        <div class="res-block">
          <div class="res-head">
            <span class="res-lbl hope-lbl">Hope</span>
            <span class="res-frac">{hope} / {maxHope}</span>
          </div>
          <div class="dot-track">
            {#each Array.from({length: maxHope}, (_, i) => i) as i (i)}
              <button class="dot hope-dot {i < hope ? 'filled' : ''}" onclick={() => setHope(i)}></button>
            {/each}
          </div>
        </div>

        <!-- Armor -->
        {#if armorSlots > 0}
          <div class="res-block">
            <div class="res-head">
              <span class="res-lbl">Armor</span>
              <span class="res-frac">{armorUsed} / {armorSlots}</span>
            </div>
            <div class="dot-track">
              {#each Array.from({length: armorSlots}, (_, i) => i) as i (i)}
                <button class="dot armor-dot {i < armorUsed ? 'filled' : ''}" onclick={() => setArmor(i)}></button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Currency -->
        {#each [['Handfuls', handfuls, adjHandfuls], ['Bags', bags, adjBags], ['Chests', chests, adjChests]] as [label, val, adj] (label)}
          <div class="res-block">
            <div class="res-head">
              <span class="res-lbl">{label}</span>
              <div class="gold-ctrl">
                <button class="gold-btn" onclick={() => adj(-1)}>−</button>
                <span class="gold-val">{val}</span>
                <button class="gold-btn" onclick={() => adj(+1)}>+</button>
              </div>
            </div>
          </div>
        {/each}

        <!-- Thresholds -->
        {#if hasThresholds}
          <div class="sidebar-label" style="margin-top:10px">Thresholds</div>
          <div class="thresh-grid">
            <div class="thresh-cell">
              <div class="thresh-lbl">Min</div>
              <div class="thresh-val">{thresholds.minor}</div>
            </div>
            <div class="thresh-cell">
              <div class="thresh-lbl">Maj</div>
              <div class="thresh-val">{thresholds.major}</div>
            </div>
            <div class="thresh-cell">
              <div class="thresh-lbl">Sev</div>
              <div class="thresh-val">{thresholds.severe}</div>
            </div>
          </div>
        {/if}

      </div>
    </aside>

    <!-- RIGHT CONTENT ─────────────────────────────────────────────────────── -->
    <div class="pcv-right">

      <!-- Conditions (always visible above tabs) -->
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

      <!-- Tab strip -->
      <div class="tab-strip">
        {#each TABS as tab (tab.id)}
          <button class="tab" class:active={activeTab === tab.id}
                  onclick={() => (activeTab = tab.id)}>
            <span class="tab-icon">{tab.icon}</span>
            <span class="tab-label">{tab.label}</span>
          </button>
        {/each}
      </div>

      <!-- Tab body -->
      <div class="tab-body">

        <!-- CARDS ─────────────────────────────────────────────────────────── -->
        {#if activeTab === 'cards'}
          {#if loadoutCards.length === 0}
            <div class="empty-state">No domain cards in loadout.</div>
          {:else}
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

        <!-- OVERVIEW ──────────────────────────────────────────────────────── -->
        {:else if activeTab === 'overview'}
          {#if abilityGroups.length === 0 && features.length === 0}
            <div class="empty-state">No abilities found.</div>
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
            {#if features.length > 0}
              <div class="section-hd">Features</div>
              <div class="features-list">
                {#each features as feat (feat)}
                  <FeatureBlock {feat} />
                {/each}
              </div>
            {/if}
          {/if}

        <!-- INVENTORY ─────────────────────────────────────────────────────── -->
        {:else if activeTab === 'inventory'}
          {#if items.length === 0}
            <div class="empty-state">No items in inventory.</div>
          {:else}
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

        <!-- NOTES ─────────────────────────────────────────────────────────── -->
        {:else if activeTab === 'notes'}
          {#if experiences.some(e => e.text)}
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
          {/if}
          <div class="section-hd" style="margin-top: {experiences.some(e => e.text) ? '18px' : '0'}">Notes</div>
          <textarea
            class="notes-area"
            placeholder="Session notes, reminders, plans…"
            bind:value={notes}
            oninput={touchNotes}
          ></textarea>
        {/if}

      </div>
    </div>
  </div>
</div>

<style>
  /* ── Shell ───────────────────────────────────────────────────────────────── */
  .pcv {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    background: var(--bg);
  }

  /* ── Header ──────────────────────────────────────────────────────────────── */
  .pcv-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
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
  .pcv-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .ss { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-dim); }
  .ss.ok  { color: #6ec38c; }
  .ss.err { color: var(--danger); }
  .icon-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-dim);
    font-size: 0.95rem;
    padding: 3px 7px;
    cursor: pointer;
    text-decoration: none;
    display: flex;
    align-items: center;
    -webkit-tap-highlight-color: transparent;
    line-height: 1.4;
  }
  .icon-btn:active { color: var(--text); border-color: var(--border2); }
  .theme-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid var(--border2);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    flex-shrink: 0;
  }
  .rest-wrap { position: relative; }
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

  /* ── Hero ────────────────────────────────────────────────────────────────── */
  .pcv-hero {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
    background: var(--surface2);
    border-bottom: 1px solid var(--border);
  }
  .hero-avatar { width: 44px; height: 44px; flex-shrink: 0; }
  .avatar-ph {
    width: 100%;
    height: 100%;
    background: var(--surface3);
    border: 2px solid var(--border);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-head);
    font-size: 1.25rem;
    color: var(--text-dim);
  }
  .hero-identity { flex: 1; min-width: 0; }
  .hero-badges { display: flex; flex-wrap: wrap; gap: 5px; }
  .hero-badge {
    display: inline-block;
    font-size: 0.72rem;
    padding: 2px 7px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    color: var(--text);
    white-space: nowrap;
  }
  .hero-badge.dim { color: var(--text-dim); }
  .hero-player { font-size: 0.68rem; color: var(--text-faint); font-style: italic; margin-top: 4px; }

  /* ── Body: two-column layout ─────────────────────────────────────────────── */
  .pcv-body {
    flex: 1;
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 0;
    align-items: start;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }

  /* ── Sidebar ─────────────────────────────────────────────────────────────── */
  .pcv-sidebar {
    background: var(--surface2);
    border-right: 1px solid var(--border);
    padding: 14px;
    position: sticky;
    top: 49px; /* header height */
    max-height: calc(100dvh - 49px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sidebar-label {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-dim);
    font-weight: 600;
    margin-bottom: 4px;
  }

  /* Traits */
  .traits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
  .trait-card {
    background: var(--surface3);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 7px 5px;
    text-align: center;
  }
  .trait-val { font-family: var(--font-head); font-size: 1.15rem; font-weight: 600; color: var(--text-dim); line-height: 1; }
  .trait-card.positive .trait-val { color: var(--accent); }
  .trait-card.negative .trait-val { color: var(--danger); }
  .trait-name { font-family: var(--font-mono); font-size: 0.52rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); margin-top: 2px; }

  /* Evasion */
  .evasion-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid var(--border2);
    background: var(--surface3);
    font-family: var(--font-head);
    font-size: 1.1rem;
    color: var(--text);
  }

  /* Resource blocks */
  .res-list { display: flex; flex-direction: column; gap: 8px; }
  .res-block { display: flex; flex-direction: column; gap: 3px; }
  .res-head { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
  .res-lbl { font-family: var(--font-mono); font-size: 0.6rem; text-transform: uppercase; color: var(--text-dim); }
  .hope-lbl { color: var(--accent); }
  .res-frac { font-family: var(--font-mono); font-size: 0.68rem; color: var(--text-dim); }

  /* Dot tracks */
  .dot-track { display: flex; flex-wrap: wrap; gap: 3px; }
  .dot {
    width: 13px;
    height: 13px;
    border-radius: 50%;
    border: 1.5px solid var(--border2);
    background: transparent;
    cursor: pointer;
    padding: 0;
    transition: background 0.1s, border-color 0.1s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .dot:hover { border-color: var(--accent); }
  .hp-dot.filled    { background: var(--hp-on, #d64040);     border-color: var(--hp-on, #d64040); }
  .stress-dot.filled { background: var(--stress-on, #d8a040); border-color: var(--stress-on, #d8a040); }
  .hope-dot.filled  { background: var(--accent);              border-color: var(--accent); }
  .armor-dot.filled { background: var(--text-dim);            border-color: var(--text-dim); }

  /* Currency */
  .gold-ctrl { display: flex; align-items: center; gap: 4px; }
  .gold-val { font-family: var(--font-mono); font-size: 0.8rem; font-weight: 600; min-width: 22px; text-align: center; }
  .gold-btn {
    width: 20px;
    height: 20px;
    background: var(--surface3);
    border: 1px solid var(--border);
    border-radius: 3px;
    color: var(--text);
    cursor: pointer;
    font-size: 0.85rem;
    line-height: 1;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .gold-btn:active { border-color: var(--accent); color: var(--accent); }

  /* Thresholds */
  .thresh-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }
  .thresh-cell {
    background: var(--surface3);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 5px 3px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .thresh-lbl { font-family: var(--font-mono); font-size: 0.52rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); }
  .thresh-val { font-family: var(--font-head); font-size: 1rem; color: var(--hp-on); }

  /* ── Right panel ─────────────────────────────────────────────────────────── */
  .pcv-right {
    display: flex;
    flex-direction: column;
    min-height: calc(100dvh - 49px - 72px); /* viewport minus header and hero */
    background: var(--surface2);
    border-left: 0; /* border is on sidebar */
  }

  /* Conditions */
  .conditions-row {
    display: flex;
    gap: 6px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .cond-btn {
    flex: 1;
    padding: 8px 6px;
    border-radius: 5px;
    border: 1px solid var(--border);
    background: var(--surface2);
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transition: all 0.15s;
  }
  .cond-btn:active { opacity: 0.7; }
  .cond-vulnerable.active { background: color-mix(in srgb, #d64545 22%, var(--surface2)); color: #d64545; border-color: #d64545; }
  .cond-hidden.active     { background: color-mix(in srgb, #6b7fcc 22%, var(--surface2)); color: #6b7fcc; border-color: #6b7fcc; }
  .cond-restrained.active { background: color-mix(in srgb, #d4a744 22%, var(--surface2)); color: #d4a744; border-color: #d4a744; }

  /* Tab strip */
  .tab-strip {
    display: flex;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .tab-strip::-webkit-scrollbar { display: none; }
  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    justify-content: center;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    color: var(--text-dim);
    padding: 10px 8px;
    font-size: 0.78rem;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transition: color 0.12s;
  }
  .tab:active { opacity: 0.7; }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .tab-icon { font-size: 0.88rem; }
  .tab-label { font-size: 0.75rem; }

  /* Tab body */
  .tab-body { padding: 16px; display: flex; flex-direction: column; gap: 0; flex: 1; }

  /* Shared content styles */
  .section-hd {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    margin-bottom: 8px;
    margin-top: 16px;
  }
  .section-hd:first-child { margin-top: 0; }
  .empty-state { color: var(--text-dim); font-size: 0.88rem; text-align: center; padding: 40px 20px; }

  /* Cards tab */
  .cards-list { display: flex; flex-direction: column; gap: 10px; }

  /* Overview tab */
  .abilities-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
  .locked-ability { opacity: 0.5; pointer-events: none; }
  .locked-badge { font-family: var(--font-mono); font-size: 0.6rem; color: var(--text-dim); padding: 2px 6px; text-align: right; }
  .features-list { display: flex; flex-direction: column; gap: 10px; }

  /* Inventory tab */
  .items-list { display: flex; flex-direction: column; gap: 1px; background: var(--border); border-radius: 6px; overflow: hidden; }
  .item-row { background: var(--surface2); display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; }
  .item-row.equipped { background: color-mix(in srgb, var(--accent) 5%, var(--surface2)); }
  .item-info { flex: 1; min-width: 0; }
  .item-name { font-size: 0.9rem; font-weight: 600; color: var(--text); }
  .item-type { display: inline-block; font-family: var(--font-mono); font-size: 0.56rem; text-transform: uppercase; letter-spacing: 0.05em; background: var(--surface3); color: var(--text-dim); border-radius: 3px; padding: 1px 5px; margin-top: 3px; }
  .item-detail { display: block; font-size: 0.7rem; color: var(--text-dim); margin-top: 2px; }
  .item-notes { font-size: 0.74rem; color: var(--text-dim); margin-top: 4px; line-height: 1.4; }
  .item-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
  .item-qty { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-dim); }
  .item-equipped-badge { font-family: var(--font-mono); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.05em; background: color-mix(in srgb, var(--accent) 15%, var(--surface2)); color: var(--accent); border: 1px solid var(--accent); border-radius: 3px; padding: 1px 5px; }

  /* Notes tab */
  .exp-list { display: flex; flex-direction: column; gap: 2px; background: var(--border); border-radius: 6px; overflow: hidden; margin-bottom: 4px; }
  .exp-row { display: flex; align-items: center; gap: 12px; background: var(--surface2); padding: 10px 14px; }
  .exp-mod { font-family: var(--font-head); font-size: 1rem; min-width: 28px; color: var(--accent); }
  .exp-text { font-size: 0.86rem; flex: 1; }
  .notes-area {
    width: 100%;
    min-height: 200px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-family: var(--font-body);
    font-size: 0.9rem;
    line-height: 1.6;
    padding: 12px;
    resize: none;
    outline: none;
    box-sizing: border-box;
    flex: 1;
  }
  .notes-area:focus { border-color: var(--border2); }

  /* ── Mobile: stack sidebar above content ─────────────────────────────────── */
  @media (max-width: 720px) {
    .pcv-body {
      grid-template-columns: 1fr;
    }
    .pcv-sidebar {
      position: static;
      max-height: none;
      border-right: none;
      border-bottom: 1px solid var(--border);
    }
    .pcv-right {
      min-height: auto;
    }
  }

  /* ── Desktop: wider content area ─────────────────────────────────────────── */
  @media (min-width: 721px) {
    .tab-body { padding: 20px 22px; }
    .pcv-hero { padding: 14px 20px; }
  }
</style>
