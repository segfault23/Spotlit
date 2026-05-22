<script>
  import { roster } from '$lib/stores/roster.js';
  import { closeModal } from '$lib/stores/modal.js';

  let name    = $state('');
  let maxHP   = $state(6);
  let maxStr  = $state(6);
  let evasion = $state(10);
  let armor   = $state(3);

  const inputCls = 'bg-surface2 border border-border rounded px-2 py-1.5 text-text font-body text-[0.88rem] outline-none w-full focus:border-accent-dim';
  const labelCls = 'font-mono text-[0.58rem] uppercase tracking-[1.5px] text-text-dim';

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
  class="fixed inset-0 bg-black/[.78] z-[100] flex items-center justify-center"
  role="dialog"
  aria-modal="true"
  tabindex="-1"
  onclick={e => e.target === e.currentTarget && closeModal()}
  onkeydown={e => e.key === 'Escape' && closeModal()}
>
  <div class="bg-surface border border-border2 rounded-[10px] p-5 w-[380px] max-w-[96vw] max-h-[88vh] overflow-hidden flex flex-col">
    <div class="font-head text-[1.1rem] text-accent pb-[10px] border-b border-border shrink-0 mb-3">Party Roster</div>

    <div class="flex-1 overflow-y-auto min-h-0 flex flex-col gap-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-sm">
      <p class="font-mono text-[0.6rem] uppercase tracking-[2px] text-text-faint mb-1">Saved characters</p>
      <div class="flex flex-col gap-[5px] max-h-[280px] overflow-y-auto">
        {#if $roster.length}
          {#each $roster as r (r.id)}
            <div class="flex items-center gap-2 px-[10px] py-2 border border-border rounded-[5px] bg-surface2">
              <div class="flex-1">
                <div class="font-head text-[0.95rem] text-[#7abf94]">{r.name}</div>
                <div class="font-mono text-[0.58rem] text-text-dim">HP {r.maxHP} · Stress {r.maxStr} · Evasion {r.evasion} · Armor {r.armor}</div>
              </div>
              <button
                class="px-[7px] py-1 bg-transparent border border-border rounded-[3px] text-text-faint cursor-pointer text-[0.72rem] transition-all hover:border-danger hover:text-danger"
                onclick={() => deleteEntry(r.id)}
              >✕</button>
            </div>
          {/each}
        {:else}
          <div class="text-center text-text-faint italic text-[0.88rem] py-3">No characters saved yet.</div>
        {/if}
      </div>

      <hr class="border-0 border-t border-border my-1" />
      <p class="font-mono text-[0.6rem] uppercase tracking-[2px] text-text-faint mb-1">Add character to roster</p>

      <div class="flex flex-col gap-1">
        <label for="r-name" class={labelCls}>Name</label>
        <input id="r-name" type="text" placeholder="Character name" class={inputCls} bind:value={name} />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="flex flex-col gap-1">
          <label for="r-hp" class={labelCls}>Max HP</label>
          <input id="r-hp" type="number" min="1" max="12" class={inputCls} bind:value={maxHP} />
        </div>
        <div class="flex flex-col gap-1">
          <label for="r-str" class={labelCls}>Max Stress</label>
          <input id="r-str" type="number" min="1" max="12" class={inputCls} bind:value={maxStr} />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="flex flex-col gap-1">
          <label for="r-ev" class={labelCls}>Evasion</label>
          <input id="r-ev" type="number" class={inputCls} bind:value={evasion} />
        </div>
        <div class="flex flex-col gap-1">
          <label for="r-arm" class={labelCls}>Armor Score</label>
          <input id="r-arm" type="number" min="0" max="12" class={inputCls} bind:value={armor} />
        </div>
      </div>
    </div>

    <div class="flex gap-[7px] justify-end pt-[10px] mt-[10px] border-t border-border shrink-0">
      <button class="bg-surface2 border border-border rounded px-3 py-[7px] text-text-dim font-body cursor-pointer text-[0.88rem]" onclick={closeModal}>Close</button>
      <button class="bg-accent-dim border border-accent rounded px-[18px] py-[7px] text-[#f0dfa0] font-body font-semibold cursor-pointer text-[0.88rem] transition-opacity hover:opacity-85" onclick={save}>Save to Roster</button>
    </div>
  </div>
</div>
