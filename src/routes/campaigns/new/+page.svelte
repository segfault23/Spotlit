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
</script>

<div class="page">
  <header class="pg-head">
    <a class="back-link" href="/profile?tab=campaigns">← Campaigns</a>
  </header>

  <div class="form-card">
    <h1 class="form-title">New Campaign</h1>

    <div class="fg">
      <label for="camp-name">Campaign Name</label>
      <input id="camp-name" type="text" placeholder="e.g. Shattered Realms" bind:value={name} />
    </div>

    <div class="fg">
      <label for="camp-desc">Description <span class="dim">(optional)</span></label>
      <textarea id="camp-desc" rows="3" placeholder="A short description for your players…" bind:value={description}></textarea>
    </div>

    {#if err}<div class="err">{err}</div>{/if}

    <div class="form-foot">
      <a class="btn-c" href="/profile?tab=campaigns">Cancel</a>
      <button class="btn-p" disabled={saving} onclick={save}>
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
  }
</style>
