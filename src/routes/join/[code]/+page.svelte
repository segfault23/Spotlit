<script>
  import { goto } from '$app/navigation';

  let { data } = $props();
  let { campaign, available, code } = $derived(data);

  let joining = $state(null); // charId being joined

  async function linkCharacter(charId) {
    joining = charId;
    try {
      const res = await fetch(`/api/campaigns/join/${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ charId }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      goto(`/characters/${encodeURIComponent(charId)}`);
    } catch (e) {
      alert(`Failed to join: ${e.message}`);
      joining = null;
    }
  }

  function fmtLevel(c) {
    return [c.class, c.subclass ? `(${c.subclass})` : null, c.level ? `Lv ${c.level}` : null]
      .filter(Boolean).join(' ');
  }
</script>

<div class="join-page">
  <div class="join-card">
    <div class="join-header">
      <div class="join-badge">Campaign Invite</div>
      <h1 class="join-campaign">{campaign.name}</h1>
      {#if campaign.description}
        <p class="join-desc">{campaign.description}</p>
      {/if}
      <div class="join-code-row">
        <code class="join-code">{code}</code>
      </div>
    </div>

    <div class="join-body">
      {#if available.length > 0}
        <p class="sect-title">Link an existing character</p>
        <div class="avail-list">
          {#each available as char (char.id)}
            <div class="avail-row">
              <div class="avail-avatar">
                {#if char.profilePhoto}
                  <img src={char.profilePhoto} alt={char.name} />
                {:else}
                  <div class="avail-ph">{char.name?.[0] ?? '?'}</div>
                {/if}
              </div>
              <div class="avail-info">
                <div class="avail-name">{char.name || 'Unnamed'}</div>
                <div class="avail-sub">{fmtLevel(char)}</div>
              </div>
              <button
                class="btn-p"
                disabled={joining === char.id}
                onclick={() => linkCharacter(char.id)}
              >
                {joining === char.id ? 'Linking…' : 'Link'}
              </button>
            </div>
          {/each}
        </div>
        <hr class="divider" />
      {/if}

      <p class="sect-title">Create a new character for this campaign</p>
      <a class="btn-p create-btn" href="/characters/new?campaign={code}">
        + Create New Character
      </a>

      <a class="cancel-link" href="/characters">← Back to my characters</a>
    </div>
  </div>
</div>

<style>
  .join-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .join-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    width: 100%;
    max-width: 480px;
    overflow: hidden;
  }

  .join-header {
    padding: 28px 28px 20px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    text-align: center;
  }
  .join-badge {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border: 1px solid var(--accent);
    border-radius: 3px;
    padding: 2px 8px;
    margin-bottom: 10px;
  }
  .join-campaign {
    font-family: var(--font-head);
    font-size: 1.8rem;
    margin: 0 0 8px;
  }
  .join-desc {
    color: var(--text-dim);
    font-size: 0.88rem;
    margin: 0 0 12px;
  }
  .join-code-row { margin-top: 8px; }
  .join-code {
    font-family: var(--font-mono);
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-dim);
    letter-spacing: 0.2em;
  }

  .join-body {
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sect-title {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    font-weight: 600;
    margin: 0;
  }

  .avail-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .avail-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 5px;
  }
  .avail-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
  }
  .avail-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .avail-ph {
    width: 100%;
    height: 100%;
    background: var(--surface2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-head);
    font-size: 1rem;
    color: var(--text-dim);
  }
  .avail-info { flex: 1; min-width: 0; }
  .avail-name { font-weight: 600; font-size: 0.9rem; }
  .avail-sub { font-size: 0.72rem; color: var(--text-dim); }

  .divider { border: none; border-top: 1px solid var(--border); margin: 4px 0; }

  .create-btn {
    display: block;
    text-align: center;
    padding: 10px;
    font-size: 0.9rem;
    text-decoration: none;
  }

  .cancel-link {
    text-align: center;
    color: var(--text-dim);
    font-size: 0.8rem;
    text-decoration: none;
    display: block;
    margin-top: 4px;
  }
  .cancel-link:hover { color: var(--text); }
</style>
