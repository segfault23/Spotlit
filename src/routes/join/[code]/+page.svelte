<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let { data } = $props();
  let { campaign, code } = $derived(data);

  let available = $state([]);
  let loadingCampaign = $state(true);
  let joining = $state(null); // charId being joined

  onMount(async () => {
    try {
      const res = await fetch('/api/characters');
      if (!res.ok) return;
      const { characters } = await res.json();
      available = characters.filter((c) => c.campaignCode !== code);
    } catch { /* silently ignore */ } finally {
      loadingCampaign = false;
    }
  });

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
      {#if loadingCampaign}
        <p class="sect-title">Link an existing character</p>
        <div class="avail-list">
          {#each {length: 3} as _}
            <div class="avail-row">
              <div class="avail-avatar bg-surface3 animate-pulse"></div>
              <div class="avail-info">
                <div class="h-4 w-32 bg-surface3 rounded animate-pulse mb-1"></div>
                <div class="h-3 w-24 bg-surface3 rounded animate-pulse"></div>
              </div>
              <div class="h-8 w-14 bg-surface3 rounded animate-pulse shrink-0"></div>
            </div>
          {/each}
        </div>
        <hr class="divider" />
      {:else if available.length > 0}
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
                class="bg-accent-dim border border-accent rounded px-[18px] py-[7px] text-[#f0dfa0] font-body font-semibold cursor-pointer text-[0.88rem] transition-opacity hover:opacity-85 disabled:opacity-50"
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
      <a class="block text-center p-[10px] text-[0.9rem] no-underline bg-accent-dim border border-accent rounded text-[#f0dfa0] font-body font-semibold cursor-pointer transition-opacity hover:opacity-85" href="/characters/new?campaign={code}">
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
