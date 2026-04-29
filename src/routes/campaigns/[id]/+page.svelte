<script>
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';

  let { data } = $props();
  let { campaign, characters } = $derived(data);

  let copied = $state(false);
  function copyJoinCode() {
    const url = `${$page.url.origin}/join/${campaign.joinCode}`;
    navigator.clipboard.writeText(url);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  async function deleteCharacter(ownerSub, charId) {
    if (!confirm('Remove this character from the campaign?')) return;
    // charId is the full sk (CHARACTER#...)
    const ref = encodeURIComponent(`${ownerSub}|${charId}`);
    await fetch(`/api/campaigns/${encodeURIComponent(campaign.id)}/characters/${ref}`, {
      method: 'DELETE',
    });
    await invalidateAll();
  }

  async function deleteCampaign() {
    if (!confirm('Delete this campaign? Characters will remain but lose their campaign link.')) return;
    await fetch(`/api/campaigns/${encodeURIComponent(campaign.id)}`, { method: 'DELETE' });
    goto('/profile?tab=campaigns');
  }

  function editCharHref(char) {
    const ref = encodeURIComponent(`${char.ownerSub}|${char.id}`);
    return `/campaigns/${encodeURIComponent(campaign.id)}/characters/${ref}`;
  }

  function fmtLevel(c) {
    return [c.class, c.subclass, `Level ${c.level}`].filter(Boolean).join(' · ');
  }
</script>

<div class="campaign-page">
  <header class="camp-head">
    <a class="back-link" href="/profile?tab=campaigns">← Campaigns</a>
    <div class="camp-actions">
      <button class="btn-c btn-danger" onclick={deleteCampaign}>Delete Campaign</button>
    </div>
  </header>

  <div class="camp-hero">
    <h1 class="camp-name">{campaign.name}</h1>
    {#if campaign.description}
      <p class="camp-desc">{campaign.description}</p>
    {/if}

    <div class="join-block">
      <span class="join-label">Player invite link</span>
      <div class="join-row">
        <code class="join-code">{campaign.joinCode}</code>
        <button class="btn-p" onclick={copyJoinCode}>
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
      <span class="join-hint">Players visit /join/{campaign.joinCode} to link their character</span>
    </div>
  </div>

  <div class="section-head">
    <h2>Characters ({characters.length})</h2>
    <a class="btn-p" href="/campaigns/{encodeURIComponent(campaign.id)}/characters/new">
      + Add Character
    </a>
  </div>

  {#if characters.length === 0}
    <div class="empty-block">
      No characters yet. Share the invite link above, or create one on behalf of a player.
    </div>
  {:else}
    <div class="char-grid">
      {#each characters as char (char.id)}
        <div class="char-card">
          <div class="char-avatar">
            {#if char.profilePhoto}
              <img src={char.profilePhoto} alt={char.name} />
            {:else}
              <div class="char-avatar-placeholder">{char.name?.[0] ?? '?'}</div>
            {/if}
          </div>
          <div class="char-info">
            <a class="char-name" href={editCharHref(char)}>{char.name || 'Unnamed'}</a>
            <div class="char-sub">{fmtLevel(char)}</div>
            {#if char.ancestry || char.community}
              <div class="char-sub">{[char.ancestry, char.community].filter(Boolean).join(' · ')}</div>
            {/if}
            <div class="char-player">{char.playerName || 'Unknown player'}</div>
          </div>
          <div class="char-resources">
            <div class="res-row">
              <span class="res-lbl">HP</span>
              <span class="res-val">{char.hp ?? char.maxHP}/{char.maxHP}</span>
            </div>
            <div class="res-row">
              <span class="res-lbl">Stress</span>
              <span class="res-val">{char.stress ?? 0}/{char.maxStress}</span>
            </div>
            <div class="res-row">
              <span class="res-lbl">Hope</span>
              <span class="res-val">{char.hope ?? char.maxHope}/{char.maxHope}</span>
            </div>
          </div>
          <div class="char-foot">
            <a class="btn-c" href={editCharHref(char)}>Edit Sheet</a>
            <button class="btn-c btn-danger" onclick={() => deleteCharacter(char.ownerSub, char.id)}>
              Remove
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .campaign-page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 18px 22px 60px;
  }

  .camp-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .back-link {
    color: var(--text-dim);
    text-decoration: none;
    font-size: 0.85rem;
  }
  .back-link:hover { color: var(--text); }

  .camp-hero {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 20px 24px;
    margin-bottom: 28px;
  }
  .camp-name {
    font-family: var(--font-head);
    font-size: 2rem;
    margin: 0 0 6px;
  }
  .camp-desc {
    color: var(--text-dim);
    margin: 0 0 16px;
    font-size: 0.9rem;
  }

  .join-block {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }
  .join-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    font-weight: 600;
  }
  .join-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .join-code {
    font-family: var(--font-mono);
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--accent);
    letter-spacing: 0.15em;
    padding: 6px 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
  }
  .join-hint {
    font-size: 0.75rem;
    color: var(--text-faint);
  }

  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .section-head h2 {
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
  }

  .char-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }

  .char-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .char-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
  }
  .char-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .char-avatar-placeholder {
    width: 100%;
    height: 100%;
    background: var(--surface3);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-head);
    font-size: 1.4rem;
    color: var(--text-dim);
    border-radius: 50%;
  }

  .char-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .char-name {
    font-family: var(--font-head);
    font-size: 1.05rem;
    color: var(--text);
    text-decoration: none;
    line-height: 1.2;
  }
  .char-name:hover { color: var(--accent); }
  .char-sub {
    font-size: 0.75rem;
    color: var(--text-dim);
  }
  .char-player {
    font-size: 0.72rem;
    color: var(--text-faint);
    font-style: italic;
    margin-top: 2px;
  }

  .char-resources {
    display: flex;
    gap: 12px;
    padding: 8px 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  .res-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    flex: 1;
  }
  .res-lbl {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
  }
  .res-val {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text);
  }

  .char-foot {
    display: flex;
    gap: 6px;
  }
  .char-foot > * {
    flex: 1;
    text-align: center;
    font-size: 0.75rem;
    padding: 5px 8px;
  }

  .btn-danger { color: var(--danger); }
  .btn-danger:hover {
    background: color-mix(in srgb, var(--danger) 15%, var(--surface2));
  }
</style>
