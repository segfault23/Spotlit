<script>
  import { roster } from '$lib/stores/roster.js';
  import { encounter } from '$lib/stores/encounter.js';
  import { closeModal } from '$lib/stores/modal.js';
  import { onMount } from 'svelte';

  let activeTab = $state('campaign'); // 'campaign' | 'roster' | 'custom'

  // Campaign characters
  let campaignChars = $state([]);
  let loadingCampaign = $state(false);

  onMount(async () => {
    loadingCampaign = true;
    try {
      // Collect chars from all GM's campaigns
      const cr = await fetch('/api/campaigns');
      if (!cr.ok) return;
      const { campaigns } = await cr.json();
      const all = await Promise.all(
        campaigns.map(c =>
          fetch(`/api/campaigns/${encodeURIComponent(c.id)}/characters`)
            .then(r => r.ok ? r.json() : { characters: [] })
            .then(({ characters }) => characters.map(ch => ({ ...ch, _campaignName: c.name })))
        )
      );
      campaignChars = all.flat();
    } catch { /* silently ignore */ } finally {
      loadingCampaign = false;
    }
  });

  function addFromCampaign(char) {
    encounter.addCreature({
      isPC: true,
      name: char.name,
      maxHP: char.maxHP ?? 6,
      hp: char.hp ?? char.maxHP ?? 6,
      maxStr: char.maxStress ?? 3,
      str: char.stress ?? 0,
      maxHope: char.maxHope ?? 5,
      hope: char.hope ?? char.maxHope ?? 5,
      evasion: char.evasion ?? 10,
      armor: char.armorSlots ?? 0,
      armUsed: char.armorUsed ?? 0,
      charRef: { ownerSub: char.ownerSub, charId: char.id },
    });
    closeModal();
  }

  // Roster tab
  function addFromRoster(r) {
    encounter.addCreature({
      isPC: true,
      name: r.name,
      maxHP: r.maxHP,
      maxStr: r.maxStr,
      evasion: r.evasion,
      armor: r.armor,
      armUsed: 0,
    });
    closeModal();
  }

  // Custom tab
  let name    = $state('');
  let maxHP   = $state(6);
  let maxStr  = $state(6);
  let evasion = $state(10);
  let armor   = $state(0);
  let maxHope = $state(5);

  function addCustom() {
    if (!name.trim()) return;
    encounter.addCreature({
      isPC: true,
      name: name.trim(),
      maxHP: +maxHP || 6,
      hp: +maxHP || 6,
      maxStr: +maxStr || 6,
      str: 0,
      maxHope: +maxHope || 5,
      hope: +maxHope || 5,
      evasion: +evasion || 10,
      armor: +armor || 0,
      armUsed: 0,
    });
    name = '';
    closeModal();
  }
</script>

<div
  class="overlay show"
  role="dialog"
  aria-modal="true"
  tabindex="-1"
  onclick={e => e.target === e.currentTarget && closeModal()}
  onkeydown={e => e.key === 'Escape' && closeModal()}
>
  <div class="modal modal-sm">
    <div class="modal-title">Add PC to Encounter</div>

    <div class="modal-tab-strip">
      <button class="modal-tab" class:active={activeTab === 'campaign'} onclick={() => (activeTab = 'campaign')}>Campaign</button>
      <button class="modal-tab" class:active={activeTab === 'roster'}   onclick={() => (activeTab = 'roster')}>Roster</button>
      <button class="modal-tab" class:active={activeTab === 'custom'}   onclick={() => (activeTab = 'custom')}>Custom</button>
    </div>

    <div class="modal-scroll-body">

      {#if activeTab === 'campaign'}
        {#if loadingCampaign}
          <div class="empty">Loading campaign characters…</div>
        {:else if campaignChars.length === 0}
          <div class="empty">No campaign characters found. Create a campaign and have players join via <a href="/campaigns/new">Campaigns</a>.</div>
        {:else}
          {#each campaignChars as char (char.id)}
            <div class="roster-row">
              <div style="flex:1">
                <div class="roster-name">{char.name || 'Unnamed'}</div>
                <div class="roster-stats">
                  {[char.class, char.subclass].filter(Boolean).join(' · ')}
                  {char.class ? ' · ' : ''}HP {char.maxHP} · Stress {char.maxStress} · Hope {char.maxHope}
                </div>
                <div class="roster-campaign">{char._campaignName} · {char.playerName || 'Unknown player'}</div>
              </div>
              <button class="roster-add-btn" onclick={() => addFromCampaign(char)}>+ Add</button>
            </div>
          {/each}
        {/if}
      {/if}

      {#if activeTab === 'roster'}
        <div class="roster-list">
          {#if $roster.length}
            {#each $roster as r (r.id)}
              <div class="roster-row">
                <div style="flex:1">
                  <div class="roster-name">{r.name}</div>
                  <div class="roster-stats">HP {r.maxHP} · Stress {r.maxStr} · Evasion {r.evasion}</div>
                </div>
                <button class="roster-add-btn" onclick={() => addFromRoster(r)}>+ Add</button>
              </div>
            {/each}
          {:else}
            <div class="empty">No roster characters saved yet.</div>
          {/if}
        </div>
      {/if}

      {#if activeTab === 'custom'}
        <div class="fg"><label for="pc-name">Name</label><input id="pc-name" type="text" placeholder="Character name" bind:value={name} /></div>
        <div class="fgrow">
          <div class="fg"><label for="pc-hp">Max HP</label><input id="pc-hp" type="number" min="1" bind:value={maxHP} /></div>
          <div class="fg"><label for="pc-str">Max Stress</label><input id="pc-str" type="number" min="1" bind:value={maxStr} /></div>
        </div>
        <div class="fgrow">
          <div class="fg"><label for="pc-hope">Max Hope</label><input id="pc-hope" type="number" min="1" bind:value={maxHope} /></div>
          <div class="fg"><label for="pc-ev">Evasion</label><input id="pc-ev" type="number" bind:value={evasion} /></div>
        </div>
        <div class="fg"><label for="pc-arm">Armor Slots</label><input id="pc-arm" type="number" min="0" bind:value={armor} /></div>
      {/if}

    </div>

    <div class="modal-foot">
      <button class="btn-c" onclick={closeModal}>Cancel</button>
      {#if activeTab === 'custom'}
        <button class="btn-p" onclick={addCustom}>Add Custom PC</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-tab-strip {
    display: flex;
    border-bottom: 1px solid var(--border);
    padding: 0 12px;
    gap: 2px;
  }
  .modal-tab {
    background: transparent;
    border: none;
    color: var(--text-dim);
    padding: 8px 12px;
    font-size: 0.82rem;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    font-family: inherit;
  }
  .modal-tab:hover { color: var(--text); }
  .modal-tab.active { color: var(--text); border-bottom-color: var(--accent); }

  .roster-list { display: flex; flex-direction: column; gap: 4px; }
  .roster-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .roster-row:last-child { border-bottom: none; }
  .roster-name { font-weight: 600; font-size: 0.88rem; }
  .roster-stats { font-size: 0.72rem; color: var(--text-dim); margin-top: 2px; }
  .roster-campaign { font-size: 0.68rem; color: var(--text-faint); font-style: italic; }
  .roster-add-btn { background: var(--surface2); border: 1px solid var(--border); color: var(--text); padding: 4px 10px; border-radius: 3px; cursor: pointer; font-size: 0.8rem; flex-shrink: 0; }
  .roster-add-btn:hover { border-color: var(--accent); color: var(--accent); }
  .empty { color: var(--text-dim); font-size: 0.82rem; padding: 12px 0; text-align: center; }
  .empty a { color: var(--accent); }
</style>
