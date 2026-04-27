<script>
  import { roster } from '$lib/stores/roster.js';
  import { encounter } from '$lib/stores/encounter.js';
  import { closeModal } from '$lib/stores/modal.js';

  let name = $state('');
  let maxHP = $state(6);
  let maxStr = $state(6);
  let evasion = $state(10);
  let armor = $state(3);

  function addCustom() {
    if (!name.trim()) return;
    encounter.addCreature({
      isPC: true,
      name: name.trim(),
      maxHP: +maxHP || 6,
      maxStr: +maxStr || 6,
      evasion: +evasion || 10,
      armor: +armor || 0,
      armUsed: 0,
    });
    name = '';
    closeModal();
  }

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
</script>

<div
  class="overlay show"
  role="dialog"
  aria-modal="true"
  tabindex="-1"
  onclick={(e) => e.target === e.currentTarget && closeModal()}
  onkeydown={(e) => e.key === 'Escape' && closeModal()}
>
  <div class="modal modal-sm">
    <div class="modal-title">Add PC to Encounter</div>

    <div class="modal-scroll-body">
      <p class="sect-title">From roster</p>
      <div class="roster-list">
        {#if $roster.length}
          {#each $roster as r (r.id)}
            <div class="roster-row">
              <div style="flex:1">
                <div class="roster-name">{r.name}</div>
                <div class="roster-stats">
                  HP {r.maxHP} · Stress {r.maxStr} · Evasion {r.evasion} · Armor {r.armor}
                </div>
              </div>
              <button class="roster-add-btn" onclick={() => addFromRoster(r)}>+ Add</button>
            </div>
          {/each}
        {:else}
          <div class="empty" style="padding:12px 0">No characters saved yet.</div>
        {/if}
      </div>

      <hr class="divider" />
      <p class="sect-title">Or add one-time custom PC</p>

      <div class="fg">
        <label for="pc-name">Name</label><input
          id="pc-name"
          type="text"
          placeholder="Character name"
          bind:value={name}
        />
      </div>
      <div class="fgrow">
        <div class="fg">
          <label for="pc-hp">Max HP</label><input
            id="pc-hp"
            type="number"
            min="1"
            max="12"
            bind:value={maxHP}
          />
        </div>
        <div class="fg">
          <label for="pc-str">Max Stress</label><input
            id="pc-str"
            type="number"
            min="1"
            max="12"
            bind:value={maxStr}
          />
        </div>
      </div>
      <div class="fgrow">
        <div class="fg">
          <label for="pc-ev">Evasion</label><input id="pc-ev" type="number" bind:value={evasion} />
        </div>
        <div class="fg">
          <label for="pc-arm">Armor Score</label><input
            id="pc-arm"
            type="number"
            min="0"
            max="12"
            bind:value={armor}
          />
        </div>
      </div>
    </div>

    <div class="modal-foot">
      <button class="btn-c" onclick={closeModal}>Cancel</button>
      <button class="btn-p" onclick={addCustom}>Add Custom PC</button>
    </div>
  </div>
</div>
