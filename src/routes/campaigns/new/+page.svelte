<script>
  import { goto } from '$app/navigation';

  let name = $state('');
  let description = $state('');
  let saving = $state(false);
  let err = $state('');

  async function save() {
    if (!name.trim()) { err = 'Campaign name is required.'; return; }
    err = '';
    saving = true;
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const { joinCode } = await res.json();
      goto(`/campaigns/${joinCode}`);
    } catch (e) {
      err = `Failed to create campaign: ${e.message}`;
      saving = false;
    }
  }

  const fieldCls = 'bg-surface2 border border-border rounded px-2 py-1.5 text-text font-body text-[0.88rem] outline-none w-full focus:border-accent-dim';
  const labelCls = 'font-mono text-[0.58rem] uppercase tracking-[1.5px] text-text-dim';
</script>

<div class="page">
  <header class="pg-head">
    <a class="back-link" href="/profile?tab=campaigns">← Campaigns</a>
  </header>

  <div class="form-card">
    <h1 class="form-title">New Campaign</h1>

    <div class="flex flex-col gap-1">
      <label for="camp-name" class={labelCls}>Campaign Name</label>
      <input id="camp-name" type="text" placeholder="e.g. Shattered Realms" class={fieldCls} bind:value={name} />
    </div>

    <div class="flex flex-col gap-1">
      <label for="camp-desc" class={labelCls}>Description <span class="dim">(optional)</span></label>
      <textarea id="camp-desc" rows="3" placeholder="A short description for your players…" class="{fieldCls} resize-y" bind:value={description}></textarea>
    </div>

    {#if err}<div class="err">{err}</div>{/if}

    <div class="form-foot">
      <a class="bg-surface2 border border-border rounded px-3 py-[7px] text-text-dim font-body cursor-pointer text-[0.88rem] no-underline" href="/profile?tab=campaigns">Cancel</a>
      <button class="bg-accent-dim border border-accent rounded px-[18px] py-[7px] text-[#f0dfa0] font-body font-semibold cursor-pointer text-[0.88rem] transition-opacity hover:opacity-85 disabled:opacity-50" disabled={saving} onclick={save}>
        {saving ? 'Creating…' : 'Create Campaign'}
      </button>
    </div>
  </div>
</div>

<style>
  .page {
    max-width: 560px;
    margin: 0 auto;
    padding: 18px 22px 60px;
  }
  .pg-head { margin-bottom: 20px; }
  .back-link { color: var(--text-dim); text-decoration: none; font-size: 0.85rem; }
  .back-link:hover { color: var(--text); }

  .form-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .form-title {
    font-family: var(--font-head);
    font-size: 1.6rem;
    margin: 0;
  }
  .dim { color: var(--text-dim); font-weight: 400; }
  .err {
    color: var(--danger);
    font-size: 0.82rem;
    padding: 6px 10px;
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    border-radius: 3px;
  }
  .form-foot {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    align-items: center;
  }
</style>
