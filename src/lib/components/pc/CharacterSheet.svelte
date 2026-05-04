<script>
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import AbilityCard from '../cards/AbilityCard.svelte';
  import DomainCardPicker from '../cards/DomainCardPicker.svelte';
  import OverviewTab from '../tabs/OverviewTab.svelte';

  let {
    initial = null,
    campaign = null,
    ownerSub = null,
    isGmCreating = false,
    isGmEditing = false,
    campaignCode = null,
    backHref = '/characters',
    ancestries = [],
    communities = [],
    subclasses = [],
  } = $props();

  // ── Identity ──────────────────────────────────────────────────────────────────
  let name       = $state(initial?.name ?? '');
  let playerName = $state(initial?.playerName ?? '');
  let charClass  = $state(initial?.class ?? '');
  let subclass   = $state(initial?.subclass ?? '');
  let level      = $state(initial?.level ?? 1);
  let ancestry   = $state(initial?.ancestry ?? '');
  let ancestry2  = $state(initial?.ancestry2 ?? '');
  let community  = $state(initial?.community ?? '');
  let pronouns   = $state(initial?.pronouns ?? '');

  // ── Traits ────────────────────────────────────────────────────────────────────
  let agility   = $state(initial?.agility   ?? 0);
  let strength  = $state(initial?.strength  ?? 0);
  let finesse   = $state(initial?.finesse   ?? 0);
  let instinct  = $state(initial?.instinct  ?? 0);
  let presence  = $state(initial?.presence  ?? 0);
  let knowledge = $state(initial?.knowledge ?? 0);

  // ── Resources ─────────────────────────────────────────────────────────────────
  let maxHP      = $state(initial?.maxHP      ?? 6);
  let hp         = $state(initial?.hp         ?? 0);
  let maxStress  = $state(initial?.maxStress  ?? 3);
  let stress     = $state(initial?.stress     ?? 0);
  let maxHope    = $state(initial?.maxHope    ?? 5);
  let hope       = $state(initial?.hope       ?? 5);
  let evasion    = $state(initial?.evasion    ?? 10);
  let armorSlots = $state(initial?.armorSlots ?? 0);
  let armorUsed  = $state(initial?.armorUsed  ?? 0);
  let handfuls   = $state(initial?.handfuls   ?? 0);
  let bags       = $state(initial?.bags       ?? 0);
  let chests     = $state(initial?.chests     ?? 0);

  // ── Content ───────────────────────────────────────────────────────────────────
  function normalizeExp(raw) {
    return (raw ?? ['', '', '']).map(e =>
      typeof e === 'string' ? { text: e, modifier: 0 } : e
    );
  }
  let experiences   = $state(normalizeExp(initial?.experiences));
  let features      = $state([...(initial?.features      ?? [])]);
  let items         = $state([...(initial?.items         ?? [])]);
  let notes         = $state(initial?.notes ?? '');
  let thresholds    = $state({
    minor:  initial?.thresholds?.minor  ?? 0,
    major:  initial?.thresholds?.major  ?? 0,
    severe: initial?.thresholds?.severe ?? 0,
  });
  let domainLoadout = $state([...(initial?.domainLoadout ?? [])]);
  let domainVault   = $state([...(initial?.domainVault   ?? [])]);

  // ── Card data derived ─────────────────────────────────────────────────────────
  let sortedAncestries  = $derived([...ancestries].sort((a, b) => a.name.localeCompare(b.name)));
  let sortedCommunities = $derived([...communities].sort((a, b) => a.name.localeCompare(b.name)));

  let ancestryData  = $derived(ancestries.find(a => a.name === ancestry) ?? null);
  let ancestry2Data = $derived(ancestry2 ? (ancestries.find(a => a.name === ancestry2) ?? null) : null);
  let communityData = $derived(communities.find(c => c.name === community) ?? null);

  let classes            = $derived([...new Set(subclasses.map(s => s.class))].sort());
  let filteredSubclasses = $derived(
    [...new Set(subclasses.filter(s => s.class === charClass).map(s => s.subclass))].sort()
  );
  let subclassTiers = $derived(
    [...subclasses.filter(s => s.class === charClass && s.subclass === subclass)]
      .sort((a, b) => tierOrder(a.tier) - tierOrder(b.tier))
  );
  let activeDomains  = $derived(subclassTiers[0]?.domains ?? []);
  let spellcastTrait = $derived(subclassTiers[0]?.spellcastTrait ?? null);

  let ability1 = $derived(ancestryData?.abilities?.[0] ?? null);
  let ability2 = $derived(
    ancestry2Data ? (ancestry2Data?.abilities?.[1] ?? null) : (ancestryData?.abilities?.[1] ?? null)
  );

  // ── UI ────────────────────────────────────────────────────────────────────────
  let activeTab  = $state('identity');
  let charId     = $state(initial?.id ?? null);
  let saveStatus = $state('idle');
  let saveTimer;

  // ── Items ─────────────────────────────────────────────────────────────────────
  const ITEM_TYPES = ['weapon', 'armor', 'consumable', 'gear', 'tool', 'treasure'];
  const WEAPON_TRAITS = ['Agility', 'Strength', 'Finesse', 'Instinct', 'Presence', 'Knowledge'];
  const WEAPON_RANGES = ['Melee', 'Close', 'Far', 'Very Far'];

  let newItemName = $state('');
  let newItemType = $state('gear');

  function addItem() {
    if (!newItemName.trim()) return;
    items = [...items, {
      id: crypto.randomUUID(),
      name: newItemName.trim(),
      type: newItemType,
      quantity: 1,
      equipped: false,
      notes: '',
      trait: newItemType === 'weapon' ? 'Agility' : '',
      range: newItemType === 'weapon' ? 'Melee' : '',
      damage: '',
    }];
    newItemName = '';
  }
  function removeItem(id)             { items = items.filter(i => i.id !== id); }
  function updateItem(id, key, value) { items = items.map(i => i.id === id ? { ...i, [key]: value } : i); }

  // ── Tier helpers ──────────────────────────────────────────────────────────────
  function tierOrder(tier) {
    const t = tier?.toLowerCase();
    if (t === 'foundation') return 0;
    if (t === 'specialization') return 1;
    if (t === 'mastery') return 2;
    return 3;
  }

  function tierUnlockLevel(tier) {
    const t = tier?.toLowerCase();
    if (t === 'specialization') return 5;
    if (t === 'mastery') return 8;
    return 1;
  }

  // ── Class/subclass change handlers ────────────────────────────────────────────
  function onClassChange(newClass) {
    charClass = newClass;
    const newSubs = [...new Set(subclasses.filter(s => s.class === newClass).map(s => s.subclass))];
    if (!newSubs.includes(subclass)) {
      subclass = '';
      domainLoadout = [];
      domainVault = [];
    }
    touch();
  }

  function onSubclassChange(newSubclass) {
    subclass = newSubclass;
    domainLoadout = [];
    domainVault = [];
    touch();
  }

  // ── Persist ───────────────────────────────────────────────────────────────────
  function payload() {
    return {
      name: name.trim(), playerName: playerName.trim(),
      class: charClass, subclass, level: +level || 1,
      ancestry, ancestry2, community, pronouns: pronouns.trim(),
      agility: +agility, strength: +strength, finesse: +finesse,
      instinct: +instinct, presence: +presence, knowledge: +knowledge,
      maxHP: +maxHP, hp: +hp, maxStress: +maxStress, stress: +stress,
      maxHope: +maxHope, hope: +hope, evasion: +evasion,
      armorSlots: +armorSlots, armorUsed: +armorUsed,
      handfuls: +handfuls, bags: +bags, chests: +chests,
      experiences, features, items, notes, thresholds,
      domainLoadout, domainVault,
      ...(campaignCode ? { campaignCode, campaignGmSub: campaign?.gmSub } : {}),
    };
  }

  async function save() {
    clearTimeout(saveTimer);
    saveStatus = 'saving';
    try {
      let url, method;
      const code = campaign?.joinCode ?? campaignCode;
      function b64(str) {
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      }
      function b64Ref(sub, id) {
        return b64(sub + '|' + id);
      }
      if (isGmCreating) {
        url    = `/api/campaigns/${code}/characters`;
        method = 'POST';
      } else if (isGmEditing) {
        url    = `/api/campaigns/${code}/characters/${b64Ref(ownerSub, charId)}`;
        method = 'PUT';
      } else if (charId) {
        url    = `/api/characters/${b64(charId)}`;
        method = 'PUT';
      } else {
        url    = '/api/characters';
        method = 'POST';
      }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) });
      if (!res.ok) throw new Error(res.status);
      if (isGmCreating) { goto(backHref); return; }
      if (!charId) {
        const { id } = await res.json();
        charId = id;
        if (browser) {
          const encoded = btoa(id).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
          history.replaceState({}, '', `/characters/${encoded}`);
        }
      }
      saveStatus = 'saved';
      setTimeout(() => { if (saveStatus === 'saved') saveStatus = 'idle'; }, 2000);
    } catch {
      saveStatus = 'error';
      setTimeout(() => { if (saveStatus === 'error') saveStatus = 'idle'; }, 3000);
    }
  }

  function touch() {
    if (!charId && !isGmCreating && !isGmEditing) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1500);
  }

  function traitSign(v) { return v > 0 ? `+${v}` : `${v}`; }
</script>

<!-- ── Top bar ─────────────────────────────────────────────────────────────── -->
<div class="cs-wrap">
  <div class="cs-topbar">
    <a class="back-link" href={backHref}>← Back</a>
    <div class="cs-title-area">
      <input class="cs-name-input" type="text" placeholder="Character name…" bind:value={name} oninput={touch} />
      {#if pronouns}<span class="cs-pronouns">{pronouns}</span>{/if}
    </div>
    <div class="cs-save-area">
      {#if saveStatus === 'saving'}<span class="ss saving">Saving…</span>
      {:else if saveStatus === 'saved'}<span class="ss saved">Saved</span>
      {:else if saveStatus === 'error'}<span class="ss error">Error</span>{/if}
      <button class="btn-p" onclick={save}>{isGmCreating ? 'Create' : 'Save'}</button>
    </div>
  </div>

  <!-- ── Hero header ───────────────────────────────────────────────────────── -->
  <div class="cs-hero">
    <div class="hero-avatar">
      <div class="avatar-ph">{name?.[0]?.toUpperCase() ?? '?'}</div>
    </div>
    <div class="hero-identity">
      <div class="hero-class-row">
        {#if charClass}<span class="hero-badge">{charClass}{subclass ? ` · ${subclass}` : ''}</span>{/if}
        {#if level}<span class="hero-badge dim">Level {level}</span>{/if}
        {#if ancestry}<span class="hero-badge dim">{ancestry}{ancestry2 ? ` / ${ancestry2}` : ''}{community ? ` · ${community}` : ''}</span>{/if}
      </div>
      {#if playerName}<div class="hero-player">Played by {playerName}</div>{/if}
    </div>
  </div>

  <!-- ── Body: two columns ─────────────────────────────────────────────────── -->
  <div class="cs-body">

    <!-- LEFT: traits + resources -->
    <aside class="cs-left">
      <div class="section-label">Traits</div>
      <div class="traits-grid">
        {#each [['Agility', agility], ['Strength', strength], ['Finesse', finesse], ['Instinct', instinct], ['Presence', presence], ['Knowledge', knowledge]] as [label, val] (label)}
          <div class="trait-card">
            <div class="trait-val">{traitSign(val)}</div>
            <div class="trait-name">{label}</div>
          </div>
        {/each}
      </div>

      <div class="section-label" style="margin-top:14px">Evasion</div>
      <div class="evasion-badge">{evasion}</div>

      <div class="section-label" style="margin-top:14px">Resources</div>
      <div class="resources-list">
        <!-- HP -->
        <div class="res-block">
          <div class="res-head">
            <span class="res-label">HP</span>
            <span class="res-fraction">{hp} / <input class="res-max-inp" type="number" min="1" bind:value={maxHP} oninput={touch} /></span>
          </div>
          <div class="dot-track">
            {#each Array.from({length: maxHP}, (_, i) => i) as i (i)}
              <button class="dot {i < hp ? 'filled' : ''}" onclick={() => { hp = i < hp ? i : i + 1; touch(); }}></button>
            {/each}
          </div>
        </div>
        <!-- Stress -->
        <div class="res-block">
          <div class="res-head">
            <span class="res-label">Stress</span>
            <span class="res-fraction">{stress} / <input class="res-max-inp" type="number" min="1" bind:value={maxStress} oninput={touch} /></span>
          </div>
          <div class="dot-track">
            {#each Array.from({length: maxStress}, (_, i) => i) as i (i)}
              <button class="dot stress-dot {i < stress ? 'filled' : ''}" onclick={() => { stress = i < stress ? i : i + 1; touch(); }}></button>
            {/each}
          </div>
        </div>
        <!-- Hope -->
        <div class="res-block">
          <div class="res-head">
            <span class="res-label hope-label">Hope</span>
            <span class="res-fraction">{hope} / <input class="res-max-inp" type="number" min="1" bind:value={maxHope} oninput={touch} /></span>
          </div>
          <div class="dot-track">
            {#each Array.from({length: maxHope}, (_, i) => i) as i (i)}
              <button class="dot hope-dot {i < hope ? 'filled' : ''}" onclick={() => { hope = i < hope ? i : i + 1; touch(); }}></button>
            {/each}
          </div>
        </div>
        <!-- Armor -->
        <div class="res-block">
          <div class="res-head">
            <span class="res-label">Armor</span>
            <span class="res-fraction">{armorUsed} / <input class="res-max-inp" type="number" min="0" bind:value={armorSlots} oninput={touch} /></span>
          </div>
          {#if armorSlots > 0}
          <div class="dot-track">
            {#each Array.from({length: armorSlots}, (_, i) => i) as i (i)}
              <button class="dot armor-dot {i < armorUsed ? 'filled' : ''}" onclick={() => { armorUsed = i < armorUsed ? i : i + 1; touch(); }}></button>
            {/each}
          </div>
          {/if}
        </div>
        <!-- Currency -->
        {#each [['Handfuls', handfuls, (v) => { handfuls = v; touch(); }], ['Bags', bags, (v) => { bags = v; touch(); }], ['Chests', chests, (v) => { chests = v; touch(); }]] as [label, val, set] (label)}
        <div class="res-block">
          <div class="res-head">
            <span class="res-label">{label}</span>
            <div class="gold-track">
              <button class="res-btn" onclick={() => set(Math.max(0, val - 1))}>−</button>
              <span class="gold-val">{val}</span>
              <button class="res-btn" onclick={() => set(val + 1)}>+</button>
            </div>
          </div>
        </div>
        {/each}

        <!-- Damage Thresholds -->
        <div class="section-label" style="margin-top:10px">Thresholds</div>
        <div class="threshold-grid">
          <div class="threshold-cell">
            <div class="threshold-lbl">Minor</div>
            <input class="threshold-inp" type="number" min="0" bind:value={thresholds.minor} oninput={touch} />
          </div>
          <div class="threshold-cell">
            <div class="threshold-lbl">Major</div>
            <input class="threshold-inp" type="number" min="0" bind:value={thresholds.major} oninput={touch} />
          </div>
          <div class="threshold-cell">
            <div class="threshold-lbl">Severe</div>
            <input class="threshold-inp" type="number" min="0" bind:value={thresholds.severe} oninput={touch} />
          </div>
        </div>
      </div>
    </aside>

    <!-- RIGHT: tabs -->
    <div class="cs-right">
      <div class="tab-strip">
        {#each [['identity','Identity'],['overview','Overview'],['exp','Experiences'],['domain-cards','Domain Cards'],['equipment','Equipment'],['notes','Notes']] as [t, label] (t)}
          <button class="tab" class:active={activeTab === t} onclick={() => (activeTab = t)}>{label}</button>
        {/each}
      </div>

      <div class="tab-body">

        <!-- IDENTITY TAB -->
        {#if activeTab === 'identity'}
          <div class="form-grid">
            <div class="fg span2">
              <label>Character Name</label>
              <input type="text" bind:value={name} oninput={touch} placeholder="e.g. Sable Vex" />
            </div>
            <div class="fg">
              <label>Player Name</label>
              <input type="text" bind:value={playerName} oninput={touch} placeholder="Your name" />
            </div>
            <div class="fg">
              <label>Pronouns</label>
              <input type="text" bind:value={pronouns} oninput={touch} placeholder="they/them" />
            </div>

            <!-- Class -->
            <div class="fg">
              <label>Class</label>
              {#if classes.length > 0}
                <select value={charClass} onchange={(e) => onClassChange(e.currentTarget.value)}>
                  <option value="">— Select class —</option>
                  {#each classes as c (c)}<option value={c}>{c}</option>{/each}
                </select>
              {:else}
                <input type="text" bind:value={charClass} oninput={touch} placeholder="e.g. Ranger" />
              {/if}
            </div>

            <!-- Subclass -->
            <div class="fg">
              <label>Subclass</label>
              {#if classes.length > 0}
                <select value={subclass} disabled={!charClass} onchange={(e) => onSubclassChange(e.currentTarget.value)}>
                  <option value="">— Select subclass —</option>
                  {#each filteredSubclasses as s (s)}<option value={s}>{s}</option>{/each}
                </select>
              {:else}
                <input type="text" bind:value={subclass} oninput={touch} placeholder="e.g. Beastbound" />
              {/if}
            </div>

            <div class="fg">
              <label>Level</label>
              <input type="number" min="1" max="10" bind:value={level} oninput={touch} />
            </div>

            <!-- Primary Ancestry -->
            <div class="fg">
              <label>Ancestry</label>
              {#if sortedAncestries.length > 0}
                <select bind:value={ancestry} onchange={touch}>
                  <option value="">— Select ancestry —</option>
                  {#each sortedAncestries as a (a.name)}<option value={a.name}>{a.name}</option>{/each}
                </select>
              {:else}
                <input type="text" bind:value={ancestry} oninput={touch} placeholder="e.g. Elf" />
              {/if}
            </div>

            <!-- Secondary Ancestry -->
            <div class="fg">
              <label>Secondary Ancestry <span class="label-hint">(mixed)</span></label>
              {#if sortedAncestries.length > 0}
                <select bind:value={ancestry2} onchange={touch}>
                  <option value="">None</option>
                  {#each sortedAncestries as a (a.name)}<option value={a.name}>{a.name}</option>{/each}
                </select>
              {:else}
                <input type="text" bind:value={ancestry2} oninput={touch} placeholder="Optional" />
              {/if}
            </div>

            <!-- Community -->
            <div class="fg span2">
              <label>Community</label>
              {#if sortedCommunities.length > 0}
                <select bind:value={community} onchange={touch}>
                  <option value="">— Select community —</option>
                  {#each sortedCommunities as c (c.name)}<option value={c.name}>{c.name}</option>{/each}
                </select>
              {:else}
                <input type="text" bind:value={community} oninput={touch} placeholder="e.g. Wanderer" />
              {/if}
            </div>
          </div>

          <!-- Inline ancestry ability preview -->
          {#if ability1 || ability2}
            <div class="card-preview-section">
              <div class="section-sublabel">Ancestry Abilities</div>
              <div class="card-preview-list">
                {#if ability1}
                  <AbilityCard name={ability1.name ?? ''} text={ability1.text ?? ability1.description ?? ''} source={ancestry} />
                {/if}
                {#if ability2}
                  <AbilityCard name={ability2.name ?? ''} text={ability2.text ?? ability2.description ?? ''} source={ancestry2 || ancestry} />
                {/if}
              </div>
            </div>
          {/if}

          <!-- Inline community feature preview -->
          {#if communityData?.features?.length}
            <div class="card-preview-section">
              <div class="section-sublabel">Community Feature</div>
              <div class="card-preview-list">
                {#each communityData.features as feat}
                  <AbilityCard name={feat.name ?? ''} text={feat.text ?? feat.description ?? ''} source={community} />
                {/each}
              </div>
            </div>
          {/if}

          <!-- Inline subclass tier preview -->
          {#if subclassTiers.length > 0}
            <div class="card-preview-section">
              <div class="section-sublabel">Subclass Features</div>
              {#each subclassTiers as tier}
                {@const unlockLvl = tierUnlockLevel(tier.tier)}
                {@const locked = level < unlockLvl}
                <div class="tier-block" class:locked>
                  <div class="tier-block-head">
                    <span class="tier-block-name">{tier.tier}</span>
                    {#if unlockLvl > 1}
                      <span class="tier-block-lock">{locked ? `Unlocked at level ${unlockLvl}` : ''}</span>
                    {/if}
                  </div>
                  <div class="card-preview-list">
                    {#each tier.features ?? [] as feat}
                      <AbilityCard name={feat.name ?? ''} text={feat.text ?? feat.description ?? ''} />
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {/if}

          <div class="section-label" style="margin-top:18px">Traits</div>
          <div class="traits-edit-grid">
            {#each [['Agility', 'agility'], ['Strength', 'strength'], ['Finesse', 'finesse'], ['Instinct', 'instinct'], ['Presence', 'presence'], ['Knowledge', 'knowledge']] as [label, key] (key)}
              <div class="fg">
                <label>{label}</label>
                <input type="number" min="-5" max="5"
                  value={key === 'agility' ? agility : key === 'strength' ? strength : key === 'finesse' ? finesse : key === 'instinct' ? instinct : key === 'presence' ? presence : knowledge}
                  oninput={(e) => {
                    const v = +e.currentTarget.value;
                    if (key === 'agility')        agility   = v;
                    else if (key === 'strength')  strength  = v;
                    else if (key === 'finesse')   finesse   = v;
                    else if (key === 'instinct')  instinct  = v;
                    else if (key === 'presence')  presence  = v;
                    else                          knowledge = v;
                    touch();
                  }}
                />
              </div>
            {/each}
          </div>

          <div class="section-label" style="margin-top:18px">Combat Stats</div>
          <div class="form-grid">
            <div class="fg"><label>Evasion</label><input type="number" bind:value={evasion} oninput={touch} /></div>
            <div class="fg"><label>Max HP</label><input type="number" min="1" bind:value={maxHP} oninput={touch} /></div>
            <div class="fg"><label>Max Stress</label><input type="number" min="1" bind:value={maxStress} oninput={touch} /></div>
            <div class="fg"><label>Max Hope</label><input type="number" min="1" bind:value={maxHope} oninput={touch} /></div>
            <div class="fg"><label>Armor Slots</label><input type="number" min="0" bind:value={armorSlots} oninput={touch} /></div>
          </div>
        {/if}

        <!-- OVERVIEW TAB -->
        {#if activeTab === 'overview'}
          <OverviewTab
            {ancestry}
            {ancestry2}
            {ancestryData}
            {ancestry2Data}
            {communityData}
            {subclassTiers}
            {charClass}
            {subclass}
            {level}
            {spellcastTrait}
          />
        {/if}

        <!-- EXPERIENCES TAB -->
        {#if activeTab === 'exp'}
          <p class="tab-hint">Three short phrases describing what your character has experienced. Add a +modifier to roll when relevant.</p>
          <div class="exp-list">
            {#each experiences as _exp, i (i)}
              <div class="exp-row">
                <div class="exp-mod-wrap">
                  <label class="exp-mod-label">+</label>
                  <input class="exp-mod-inp" type="number" min="0" max="9"
                    bind:value={experiences[i].modifier}
                    oninput={() => { experiences = [...experiences]; touch(); }} />
                </div>
                <input class="exp-text-inp" type="text" placeholder="e.g. Grew up in the mines"
                  bind:value={experiences[i].text}
                  oninput={() => { experiences = [...experiences]; touch(); }} />
              </div>
            {/each}
          </div>
        {/if}

        <!-- DOMAIN CARDS TAB -->
        {#if activeTab === 'domain-cards'}
          {#if !subclass || activeDomains.length === 0}
            <div class="domain-empty">
              <p>Select a class and subclass on the <button class="inline-link" onclick={() => (activeTab = 'identity')}>Identity</button> tab to unlock domain cards.</p>
            </div>
          {:else}
            <div class="domain-tab-header">
              <span class="section-sublabel">Domains</span>
              {#each activeDomains as d (d)}<span class="domain-badge">{d}</span>{/each}
              {#if spellcastTrait}<span class="spellcast-badge">Spellcast: {spellcastTrait}</span>{/if}
            </div>
            <DomainCardPicker
              loadout={domainLoadout}
              vault={domainVault}
              domains={activeDomains}
              maxLevel={level}
              onLoadoutChange={(v) => { domainLoadout = v; touch(); }}
              onVaultChange={(v) => { domainVault = v; touch(); }}
            />
          {/if}
        {/if}

        <!-- EQUIPMENT TAB -->
        {#if activeTab === 'equipment'}
          <div class="equip-section">
            <div class="section-label">Weapons</div>
            {#each items.filter(i => i.type === 'weapon') as item (item.id)}
              <div class="item-row weapon-row">
                <input class="item-name-inp" type="text" value={item.name}
                  oninput={(e) => { updateItem(item.id, 'name', e.currentTarget.value); touch(); }} />
                <select onchange={(e) => { updateItem(item.id, 'trait', e.currentTarget.value); touch(); }}>
                  {#each WEAPON_TRAITS as t (t)}<option selected={item.trait === t}>{t}</option>{/each}
                </select>
                <select onchange={(e) => { updateItem(item.id, 'range', e.currentTarget.value); touch(); }}>
                  {#each WEAPON_RANGES as r (r)}<option selected={item.range === r}>{r}</option>{/each}
                </select>
                <input class="damage-inp" type="text" placeholder="2d6+1" value={item.damage}
                  oninput={(e) => { updateItem(item.id, 'damage', e.currentTarget.value); touch(); }} />
                <button class="rm-btn" onclick={() => { removeItem(item.id); touch(); }}>✕</button>
              </div>
            {/each}

            <div class="section-label" style="margin-top:14px">Armor &amp; Other Items</div>
            {#each items.filter(i => i.type !== 'weapon') as item (item.id)}
              <div class="item-row">
                <span class="item-type-badge">{item.type}</span>
                <input class="item-name-inp" type="text" value={item.name}
                  oninput={(e) => { updateItem(item.id, 'name', e.currentTarget.value); touch(); }} />
                <input class="item-qty-inp" type="number" min="1" value={item.quantity}
                  oninput={(e) => { updateItem(item.id, 'quantity', +e.currentTarget.value); touch(); }} />
                <label class="item-equip">
                  <input type="checkbox" checked={item.equipped}
                    onchange={(e) => { updateItem(item.id, 'equipped', e.currentTarget.checked); touch(); }} />
                  Equipped
                </label>
                <button class="rm-btn" onclick={() => { removeItem(item.id); touch(); }}>✕</button>
              </div>
            {/each}

            <div class="add-item-row">
              <input class="item-name-inp" type="text" placeholder="Item name…" bind:value={newItemName}
                onkeydown={(e) => e.key === 'Enter' && addItem()} />
              <select bind:value={newItemType}>
                {#each ITEM_TYPES as t (t)}<option value={t}>{t}</option>{/each}
              </select>
              <button class="btn-c" onclick={() => { addItem(); touch(); }}>+ Add</button>
            </div>
          </div>
        {/if}

        <!-- NOTES TAB -->
        {#if activeTab === 'notes'}
          <textarea class="notes-area" placeholder="Background, session notes, reminders…"
            bind:value={notes} oninput={touch}></textarea>
        {/if}

      </div>
    </div>
  </div>
</div>

<style>
  .cs-wrap { max-width: 1200px; margin: 0 auto; padding: 16px 20px 60px; display: flex; flex-direction: column; gap: 14px; }

  /* Top bar */
  .cs-topbar { display: flex; align-items: center; gap: 12px; }
  .back-link { color: var(--text-dim); text-decoration: none; font-size: 0.85rem; white-space: nowrap; }
  .back-link:hover { color: var(--text); }
  .cs-title-area { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; }
  .cs-name-input { flex: 1; background: transparent; border: none; border-bottom: 1px solid var(--border); color: var(--text); font-family: var(--font-head); font-size: 1.4rem; padding: 2px 0; outline: none; }
  .cs-name-input:focus { border-bottom-color: var(--accent); }
  .cs-pronouns { color: var(--text-dim); font-size: 0.8rem; white-space: nowrap; }
  .cs-save-area { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .ss { font-family: var(--font-mono); font-size: 0.72rem; }
  .ss.saving { color: var(--text-dim); }
  .ss.saved { color: #6ec38c; }
  .ss.error { color: var(--danger); }

  /* Hero */
  .cs-hero { display: flex; align-items: center; gap: 16px; padding: 14px 18px; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; }
  .hero-avatar { width: 56px; height: 56px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
  .avatar-ph { width: 100%; height: 100%; background: var(--surface3); border: 2px solid var(--border); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-head); font-size: 1.5rem; color: var(--text-dim); }
  .hero-identity { flex: 1; min-width: 0; }
  .hero-class-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
  .hero-badge { display: inline-block; font-size: 0.75rem; padding: 2px 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 3px; color: var(--text); }
  .hero-badge.dim { color: var(--text-dim); }
  .hero-player { font-size: 0.72rem; color: var(--text-faint); font-style: italic; }

  /* Body layout */
  .cs-body { display: grid; grid-template-columns: 220px 1fr; gap: 18px; align-items: start; }
  @media (max-width: 720px) { .cs-body { grid-template-columns: 1fr; } }

  /* Left panel */
  .cs-left { display: flex; flex-direction: column; gap: 6px; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 14px; }
  .section-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); font-weight: 600; margin-bottom: 4px; }

  /* Traits grid */
  .traits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .trait-card { background: var(--surface3); border: 1px solid var(--border); border-radius: 5px; padding: 8px 6px; text-align: center; }
  .trait-val { font-family: var(--font-head); font-size: 1.25rem; font-weight: 600; color: var(--text); line-height: 1; }
  .trait-name { font-family: var(--font-mono); font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); margin-top: 3px; }

  /* Evasion */
  .evasion-badge { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--border2); background: var(--surface3); font-family: var(--font-head); font-size: 1.2rem; color: var(--text); }

  /* Resources */
  .resources-list { display: flex; flex-direction: column; gap: 8px; }
  .res-block { display: flex; flex-direction: column; gap: 3px; }
  .res-head { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
  .res-label { font-family: var(--font-mono); font-size: 0.62rem; text-transform: uppercase; color: var(--text-dim); flex-shrink: 0; }
  .hope-label { color: var(--accent); }
  .res-fraction { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-dim); display: flex; align-items: center; gap: 2px; }
  .res-max-inp { width: 28px; background: transparent; border: none; border-bottom: 1px solid var(--border); color: var(--text-dim); font-family: var(--font-mono); font-size: 0.72rem; text-align: center; padding: 0; outline: none; }
  .res-max-inp:focus { border-bottom-color: var(--accent); }
  .dot-track { display: flex; flex-wrap: wrap; gap: 3px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid var(--border2); background: transparent; cursor: pointer; padding: 0; transition: background 0.1s, border-color 0.1s; -webkit-tap-highlight-color: transparent; }
  .dot.filled { background: var(--hp-on, #d64040); border-color: var(--hp-on, #d64040); }
  .dot.stress-dot.filled { background: var(--stress-on, #d8a040); border-color: var(--stress-on, #d8a040); }
  .dot.hope-dot.filled { background: var(--accent); border-color: var(--accent); }
  .dot.armor-dot.filled { background: var(--text-dim); border-color: var(--text-dim); }
  .dot:hover { border-color: var(--accent); }
  .gold-track { display: flex; align-items: center; gap: 4px; }
  .gold-val { font-family: var(--font-mono); font-size: 0.82rem; font-weight: 600; min-width: 24px; text-align: center; }
  .res-btn { width: 20px; height: 20px; background: var(--surface3); border: 1px solid var(--border); border-radius: 3px; color: var(--text); cursor: pointer; font-size: 0.85rem; line-height: 1; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .res-btn:hover { border-color: var(--accent); color: var(--accent); }
  .threshold-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }
  .threshold-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; background: var(--surface3); border: 1px solid var(--border); border-radius: 4px; padding: 5px 4px; }
  .threshold-lbl { font-family: var(--font-mono); font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); }
  .threshold-inp { width: 36px; background: transparent; border: none; border-bottom: 1px solid var(--border); color: var(--text); font-family: var(--font-head); font-size: 1rem; font-weight: 600; text-align: center; padding: 0; outline: none; }
  .threshold-inp:focus { border-bottom-color: var(--accent); }

  /* Right panel */
  .cs-right { display: flex; flex-direction: column; gap: 0; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
  .tab-strip { display: flex; border-bottom: 1px solid var(--border); overflow-x: auto; scrollbar-width: none; }
  .tab-strip::-webkit-scrollbar { display: none; }
  .tab { background: transparent; border: none; color: var(--text-dim); padding: 9px 12px; font-size: 0.8rem; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: inherit; white-space: nowrap; flex-shrink: 0; }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--text); border-bottom-color: var(--accent); }
  .tab-body { padding: 18px; display: flex; flex-direction: column; gap: 12px; }

  /* Tab: identity */
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .span2 { grid-column: span 2; }
  .fg { display: flex; flex-direction: column; gap: 3px; }
  .fg label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-dim); font-weight: 600; }
  .fg input, .fg select { background: var(--surface); border: 1px solid var(--border); border-radius: 3px; color: var(--text); font-size: 0.88rem; padding: 5px 8px; outline: none; font-family: inherit; }
  .fg input:focus, .fg select:focus { border-color: var(--accent); }
  .fg select:disabled { opacity: 0.5; cursor: not-allowed; }
  .label-hint { font-weight: 400; font-size: 0.62rem; color: var(--text-faint); text-transform: none; letter-spacing: 0; }
  .traits-edit-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .section-sublabel { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); font-weight: 600; }
  .tab-hint { color: var(--text-dim); font-size: 0.82rem; margin: 0; line-height: 1.5; }

  /* Inline card previews on Identity tab */
  .card-preview-section { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 5px; }
  .card-preview-list { display: flex; flex-direction: column; gap: 6px; }
  .tier-block { display: flex; flex-direction: column; gap: 4px; }
  .tier-block.locked { opacity: 0.55; }
  .tier-block-head { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
  .tier-block-name { font-family: var(--font-mono); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text); font-weight: 600; }
  .tier-block-lock { font-size: 0.68rem; color: #d8a040; font-style: italic; }

  /* Tab: experiences */
  .exp-list { display: flex; flex-direction: column; gap: 10px; }
  .exp-row { display: flex; align-items: center; gap: 8px; }
  .exp-mod-wrap { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
  .exp-mod-label { font-family: var(--font-mono); font-size: 0.9rem; color: var(--accent); font-weight: 700; }
  .exp-mod-inp { width: 36px; background: var(--surface); border: 1px solid var(--border); border-radius: 3px; color: var(--text); font-family: var(--font-mono); font-size: 0.9rem; font-weight: 600; text-align: center; padding: 3px 4px; outline: none; }
  .exp-mod-inp:focus { border-color: var(--accent); }
  .exp-text-inp { flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: 3px; color: var(--text); font-size: 0.88rem; padding: 5px 8px; outline: none; }
  .exp-text-inp:focus { border-color: var(--accent); }

  /* Tab: domain cards */
  .domain-empty { color: var(--text-dim); font-size: 0.82rem; line-height: 1.6; }
  .inline-link { background: none; border: none; color: var(--accent); cursor: pointer; font-size: inherit; padding: 0; font-family: inherit; text-decoration: underline; }
  .domain-tab-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .domain-badge { font-family: var(--font-mono); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); border: 1px solid var(--accent); border-radius: 3px; padding: 2px 7px; }
  .spellcast-badge { font-family: var(--font-mono); font-size: 0.68rem; color: var(--text-dim); border: 1px solid var(--border); border-radius: 3px; padding: 2px 7px; }

  /* Tab: equipment */
  .equip-section { display: flex; flex-direction: column; gap: 6px; }
  .item-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 6px 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; }
  .weapon-row { background: color-mix(in srgb, var(--accent) 5%, var(--surface)); }
  .item-name-inp { flex: 1; min-width: 100px; background: transparent; border: none; border-bottom: 1px solid var(--border); color: var(--text); font-size: 0.85rem; padding: 2px 0; outline: none; }
  .item-name-inp:focus { border-bottom-color: var(--accent); }
  .damage-inp { width: 70px; background: transparent; border: none; border-bottom: 1px solid var(--border); color: var(--text); font-size: 0.82rem; padding: 2px 0; outline: none; font-family: var(--font-mono); }
  .item-qty-inp { width: 40px; background: transparent; border: none; border-bottom: 1px solid var(--border); color: var(--text); font-size: 0.82rem; text-align: center; padding: 2px 0; outline: none; }
  .item-type-badge { font-family: var(--font-mono); font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); background: var(--surface2); border: 1px solid var(--border); border-radius: 3px; padding: 2px 6px; flex-shrink: 0; }
  .item-equip { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: var(--text-dim); cursor: pointer; }
  .rm-btn { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 0.85rem; padding: 0 4px; opacity: 0.5; flex-shrink: 0; }
  .rm-btn:hover { color: var(--danger); opacity: 1; }
  .add-item-row { display: flex; align-items: center; gap: 6px; margin-top: 6px; padding-top: 10px; border-top: 1px dashed var(--border); }

  /* Tab: notes */
  .notes-area { width: 100%; min-height: 220px; background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 10px; border-radius: 4px; font-family: var(--font-body); font-size: 0.88rem; resize: vertical; line-height: 1.6; }
  .notes-area:focus { outline: none; border-color: var(--accent); }
</style>
