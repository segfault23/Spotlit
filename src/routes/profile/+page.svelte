<script>
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { encounter } from '$lib/stores/encounter.js';

  let { data } = $props();

  // Tab state — read from URL ?tab=... so links from editors land in the right place.
  let activeTab = $derived(($page.url.searchParams.get('tab')) || 'encounters');

  function setTab(t) {
    const u = new URL($page.url);
    u.searchParams.set('tab', t);
    goto(u.pathname + u.search, { replaceState: true, noScroll: true, keepFocus: true });
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // ── Encounters ────────────────────────────────────────────────────────
  let loadingId = $state(null);

  async function loadEncounter(id) {
    loadingId = id;
    try {
      await encounter.load(id);
      goto('/');
    } catch (e) {
      loadingId = null;
      alert(`Could not load encounter: ${e.message}`);
    }
  }
  async function deleteEncounter(id) {
    if (!confirm('Delete this saved encounter?')) return;
    await fetch(`/api/encounters/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if ($encounter.currentEncounterId === id) encounter.new();
    await invalidateAll();
  }

  // ── Custom adversaries ────────────────────────────────────────────────
  async function deleteAdversary(slug) {
    if (!confirm('Delete this custom adversary?')) return;
    await fetch(`/api/creatures/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    await invalidateAll();
  }
  async function duplicateAdversary(c) {
    const copy = { ...c, name: `${c.name} (copy)` };
    delete copy.pk; delete copy.sk; delete copy.slug;
    delete copy.createdAt; delete copy.updatedAt;
    const res = await fetch('/api/creatures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(copy),
    });
    if (res.ok) {
      const { slug } = await res.json();
      goto(`/profile/adversaries/${encodeURIComponent(slug)}`);
    }
  }

  // ── Custom features ───────────────────────────────────────────────────
  async function deleteFeature(slug) {
    if (!confirm('Delete this custom feature? Adversaries that reference it by name will show "no data".')) return;
    await fetch(`/api/features/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    await invalidateAll();
  }
  // ── Campaigns ─────────────────────────────────────────────────────────
  let copiedCode = $state(null);
  function copyJoinLink(code) {
    navigator.clipboard.writeText(`${location.origin}/join/${code}`);
    copiedCode = code;
    setTimeout(() => { if (copiedCode === code) copiedCode = null; }, 2000);
  }
  async function deleteCampaign(code) {
    if (!confirm('Delete this campaign?')) return;
    await fetch(`/api/campaigns/${code}`, { method: 'DELETE' });
    await invalidateAll();
  }

  async function duplicateFeature(f) {
    const copy = { name: `${f.name} (copy)`, type: f.type, cost: f.cost, body: f.body };
    const res = await fetch('/api/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(copy),
    });
    if (res.ok) {
      const { slug } = await res.json();
      goto(`/profile/features/${encodeURIComponent(slug)}`);
    }
  }
</script>

<div class="profile-page">
  <header class="profile-head">
    <a class="back-link" href="/">← Back to encounter</a>
    <div class="profile-user">
      <div class="profile-name">{data.user.name}</div>
      <div class="profile-email">{data.user.email}</div>
    </div>
  </header>

  <div class="tab-strip">
    <button class="tab" class:active={activeTab === 'encounters'} onclick={() => setTab('encounters')}>
      📂 Encounters <span class="tab-count">{data.encounters.length}</span>
    </button>
    <button class="tab" class:active={activeTab === 'adversaries'} onclick={() => setTab('adversaries')}>
      👹 Adversaries <span class="tab-count">{data.customCreatures.length}</span>
    </button>
    <button class="tab" class:active={activeTab === 'features'} onclick={() => setTab('features')}>
      ✨ Features <span class="tab-count">{data.customFeatures.length}</span>
    </button>
    <button class="tab" class:active={activeTab === 'campaigns'} onclick={() => setTab('campaigns')}>
      ⚔️ Campaigns <span class="tab-count">{data.campaigns?.length ?? 0}</span>
    </button>
  </div>

  <main class="tab-content">

    {#if activeTab === 'encounters'}
      <div class="tab-head">
        <h2>Saved Encounters</h2>
      </div>
      {#if data.encounters.length === 0}
        <div class="empty-block">
          No saved encounters yet. Build one and it'll auto-save here.
        </div>
      {:else}
        <ul class="enc-rows">
          {#each data.encounters as enc (enc.id)}
            <li class="enc-row" class:active-row={$encounter.currentEncounterId === enc.id}>
              <div class="enc-meta">
                <div class="enc-name">{enc.name || 'Untitled'}</div>
                <div class="enc-sub">Last edited {fmtDate(enc.updatedAt)}</div>
              </div>
              <div class="enc-actions">
                <button class="btn-p" onclick={() => loadEncounter(enc.id)} disabled={loadingId !== null}>
                  {loadingId === enc.id ? 'Loading…' : 'Load'}
                </button>
                <button class="btn-c btn-danger" onclick={() => deleteEncounter(enc.id)}>Delete</button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}

    {#if activeTab === 'adversaries'}
      <div class="tab-head">
        <h2>My Adversaries</h2>
        <a class="btn-p" href="/profile/adversaries/new">+ New Adversary</a>
      </div>
      {#if data.customCreatures.length === 0}
        <div class="empty-block">
          No custom adversaries yet.
          <br /><a class="empty-cta" href="/profile/adversaries/new">Build your first one →</a>
        </div>
      {:else}
        <div class="card-grid">
          {#each data.customCreatures as c (c.slug)}
            <div class="lib-card">
              <div class="lib-head">
                <a class="lib-name" href="/profile/adversaries/{encodeURIComponent(c.slug)}">{c.name}</a>
                <div class="lib-badges">
                  <span class="badge type">{c.type}</span>
                  <span class="badge">T{c.tier}</span>
                </div>
              </div>
              <div class="lib-stats">
                <span>HP <strong>{c.maxHP}</strong></span>
                <span>Diff <strong>{c.diff}</strong></span>
                <span>ATK <strong>{c.atk}</strong></span>
              </div>
              {#if c.feats?.length}
                <div class="lib-chips">
                  {#each c.feats as feat (feat)}
                    <span class="lib-chip">{feat.split('|')[0]}</span>
                  {/each}
                </div>
              {/if}
              <div class="lib-foot">
                <a class="btn-c" href="/profile/adversaries/{encodeURIComponent(c.slug)}">Edit</a>
                <button class="btn-c" onclick={() => duplicateAdversary(c)}>Duplicate</button>
                <button class="btn-c btn-danger" onclick={() => deleteAdversary(c.slug)}>Delete</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    {#if activeTab === 'features'}
      <div class="tab-head">
        <h2>My Features</h2>
        <a class="btn-p" href="/profile/features/new">+ New Feature</a>
      </div>
      {#if data.customFeatures.length === 0}
        <div class="empty-block">
          No custom features yet.
          <br /><a class="empty-cta" href="/profile/features/new">Author your first one →</a>
        </div>
      {:else}
        <div class="card-grid feat-grid">
          {#each data.customFeatures as f (f.slug)}
            <div class="lib-card feat-card">
              <div class="lib-head">
                <span class="ftype-mini t-{(f.type ?? 'feature').toLowerCase()}">{f.type}</span>
                <a class="lib-name" href="/profile/features/{encodeURIComponent(f.slug)}">{f.name}</a>
              </div>
              {#if f.cost}<div class="feat-cost">{f.cost}</div>{/if}
              <div class="feat-body">{f.body}</div>
              <div class="lib-foot">
                <a class="btn-c" href="/profile/features/{encodeURIComponent(f.slug)}">Edit</a>
                <button class="btn-c" onclick={() => duplicateFeature(f)}>Duplicate</button>
                <button class="btn-c btn-danger" onclick={() => deleteFeature(f.slug)}>Delete</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    {#if activeTab === 'campaigns'}
      <div class="tab-head">
        <h2>My Campaigns</h2>
        <a class="btn-p" href="/campaigns/new">+ New Campaign</a>
      </div>
      {#if !data.campaigns?.length}
        <div class="empty-block">
          No campaigns yet.
          <br /><a class="empty-cta" href="/campaigns/new">Create your first campaign →</a>
        </div>
      {:else}
        <div class="card-grid">
          {#each data.campaigns as c (c.id)}
            <div class="lib-card camp-card">
              <div class="lib-head">
                <a class="lib-name" href="/campaigns/{c.joinCode}">{c.name}</a>
              </div>
              {#if c.description}<div class="camp-desc">{c.description}</div>{/if}
              <div class="camp-code-row">
                <code class="camp-code">{c.joinCode}</code>
                <button class="btn-c" onclick={() => copyJoinLink(c.joinCode)}>
                  {copiedCode === c.joinCode ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              <div class="lib-foot">
                <a class="btn-c" href="/campaigns/{c.joinCode}">Open</a>
                <button class="btn-c btn-danger" onclick={() => deleteCampaign(c.joinCode)}>Delete</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}

  </main>
</div>

<style>
  .profile-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 18px 22px 60px;
  }

  .profile-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
  }
  .back-link {
    color: var(--text-dim);
    text-decoration: none;
    font-size: 0.85rem;
  }
  .back-link:hover { color: var(--text); }
  .profile-user { text-align: right; }
  .profile-name { font-weight: 600; font-size: 0.9rem; }
  .profile-email { color: var(--text-dim); font-size: 0.75rem; }

  .tab-strip {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 22px;
  }
  .tab {
    background: transparent;
    border: none;
    color: var(--text-dim);
    padding: 10px 16px;
    font-size: 0.92rem;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: inherit;
  }
  .tab:hover { color: var(--text); }
  .tab.active {
    color: var(--text);
    border-bottom-color: var(--accent, #b080ff);
  }
  .tab-count {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    background: var(--surface2);
    padding: 1px 7px;
    border-radius: 10px;
    color: var(--text-dim);
  }

  .tab-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .tab-head h2 {
    font-family: var(--font-head);
    font-size: 1.3rem;
    margin: 0;
  }

  .empty-block {
    color: var(--text-dim);
    text-align: center;
    padding: 40px 20px;
    background: var(--surface2);
    border: 1px dashed var(--border);
    border-radius: 6px;
    line-height: 1.8;
  }
  .empty-cta {
    color: var(--accent, #b080ff);
    text-decoration: none;
    font-size: 0.9rem;
  }
  .empty-cta:hover { text-decoration: underline; }

  /* encounters list */
  .enc-rows {
    list-style: none;
    margin: 0; padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .enc-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 5px;
  }
  .enc-row.active-row {
    border-color: var(--accent, #b080ff);
    background: color-mix(in srgb, var(--accent, #b080ff) 10%, var(--surface2));
  }
  .enc-meta { flex: 1; min-width: 0; }
  .enc-name { font-weight: 600; font-size: 0.95rem; }
  .enc-sub { color: var(--text-dim); font-size: 0.75rem; margin-top: 3px; }
  .enc-actions { display: flex; gap: 6px; flex-shrink: 0; }

  /* card grids */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }
  .feat-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }

  .lib-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .lib-head {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .lib-name {
    flex: 1;
    min-width: 0;
    font-family: var(--font-head);
    font-size: 1rem;
    color: var(--text);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.2;
  }
  .lib-name:hover { color: var(--accent, #b080ff); }
  .lib-badges {
    display: flex;
    gap: 3px;
    flex-shrink: 0;
  }
  .lib-stats {
    display: flex;
    gap: 12px;
    font-size: 0.75rem;
    color: var(--text-dim);
  }
  .lib-stats strong { color: var(--text); }
  .lib-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .lib-chip {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 2px 7px;
    border-radius: 3px;
    font-size: 0.68rem;
    color: var(--text-dim);
  }
  .lib-foot {
    display: flex;
    gap: 4px;
    margin-top: auto;
    padding-top: 4px;
  }
  .lib-foot > * { flex: 1; font-size: 0.75rem; padding: 5px 8px; text-align: center; }

  .ftype-mini {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 2px 7px;
    border-radius: 3px;
    background: var(--surface);
    color: var(--text-dim);
    border: 1px solid var(--border);
    flex-shrink: 0;
  }
  .ftype-mini.t-passive  { color: var(--feat-passive,  #6ec38c); border-color: currentColor; }
  .ftype-mini.t-action   { color: var(--feat-action,   #d8a040); border-color: currentColor; }
  .ftype-mini.t-reaction { color: var(--feat-reaction, #5aafdd); border-color: currentColor; }
  .ftype-mini.t-fear     { color: var(--feat-fear,     #d64040); border-color: currentColor; }

  .feat-cost {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-dim);
  }
  .feat-body {
    font-size: 0.78rem;
    color: var(--text-dim);
    line-height: 1.4;
    max-height: 4.2em;
    overflow: hidden;
    flex: 1;
  }

  .btn-danger {
    color: var(--feat-fear);
  }
  .btn-danger:hover {
    background: color-mix(in srgb, var(--feat-fear) 18%, var(--surface2));
  }

  .camp-card { gap: 10px; }
  .camp-desc { font-size: 0.78rem; color: var(--text-dim); line-height: 1.4; }
  .camp-code-row { display: flex; align-items: center; gap: 8px; }
  .camp-code { font-family: var(--font-mono); font-size: 1rem; font-weight: 600; letter-spacing: 0.12em; color: var(--accent); padding: 3px 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 3px; }
</style>
