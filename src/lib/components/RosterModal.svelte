<script>
  import { roster } from '$lib/stores/roster.js';
  import { closeModal } from '$lib/stores/modal.js';

  let name    = $state('');
  let maxHP   = $state(6);
  let maxStr  = $state(6);
  let evasion = $state(10);
  let armor   = $state(3);

  function save() {
    if (!name.trim()) return;
    roster.update(r => [...r, {
      id: 'r_' + Date.now(),
      name: name.trim(),
      maxHP: +maxHP || 6,
      maxStr: +maxStr || 6,
      evasion: +evasion || 10,
      armor: +armor || 0
    }]);
    name = '';
  }

  function deleteEntry(id) {
    roster.update(r => r.filter(x => x.id !== id));
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
    <div class="modal-title">Party Roster</div>

    <div class="modal-scroll-body">
      <p class="sect-title">Saved characters</p>
      <div class="roster-list">
        {#if $roster.length}
          {#each $roster as r (r.id)}
            <div class="roster-row">
              <div style="flex:1">
                <div class="roster-name">{r.name}</div>
                <div class="roster-stats">HP {r.maxHP} · Stress {r.maxStr} · Evasion {r.evasion} · Armor {r.armor}</div>
              </div>
              <button class="roster-del-btn" onclick={() => deleteEntry(r.id)}>✕</button>
            </div>
          {/each}
        {:else}
          <div class="empty" style="padding:12px 0">No characters saved yet.</div>
        {/if}
      </div>

      <hr class="divider" />
      <p class="sect-title">Add character to roster</p>

      <div class="fg"><label for="r-name">Name</label><input id="r-name" type="text" placeholder="Character name" bind:value={name} /></div>
      <div class="fgrow">
        <div class="fg"><label for="r-hp">Max HP</label><input id="r-hp" type="number" min="1" max="12" bind:value={maxHP} /></div>
        <div class="fg"><label for="r-str">Max Stress</label><input id="r-str" type="number" min="1" max="12" bind:value={maxStr} /></div>
      </div>
      <div class="fgrow">
        <div class="fg"><label for="r-ev">Evasion</label><input id="r-ev" type="number" bind:value={evasion} /></div>
        <div class="fg"><label for="r-arm">Armor Score</label><input id="r-arm" type="number" min="0" max="12" bind:value={armor} /></div>
      </div>
    </div>

    <div class="modal-foot">
      <button class="btn-c" onclick={closeModal}>Close</button>
      <button class="btn-p" onclick={save}>Save to Roster</button>
    </div>
  </div>
</div>
