<script>
  import { invalidateAll } from '$app/navigation';

  let { data } = $props();

  async function deleteCharacter(char) {
    if (!confirm(`Delete ${char.name || 'this character'}? This cannot be undone.`)) return;
    await fetch(`/api/characters/${encodeURIComponent(char.id)}`, { method: 'DELETE' });
    await invalidateAll();
  }

  function fmtLevel(c) {
    return [c.class, c.subclass ? `(${c.subclass})` : null, `Lv ${c.level}`]
      .filter(Boolean).join(' ');
  }
</script>

<div class="page">
  <header class="pg-head">
    <a class="back-link" href="/">← Encounter</a>
    <h1 class="pg-title">My Characters</h1>
    <a class="btn-p" href="/characters/new">+ New Character</a>
  </header>

  {#if data.characters.length === 0}
    <div class="empty-block">
      No characters yet.
      <br /><a class="empty-cta" href="/characters/new">Create your first character →</a>
    </div>
  {:else}
    <div class="char-grid">
      {#each data.characters as char (char.id)}
        <div class="char-card">
          <div class="char-top">
            <div class="char-avatar">
              {#if char.profilePhoto}
                <img src={char.profilePhoto} alt={char.name} />
              {:else}
                <div class="char-avatar-ph">{char.name?.[0] ?? '?'}</div>
              {/if}
            </div>
            <div class="char-identity">
              <a class="char-name" href="/characters/{encodeURIComponent(char.id)}">{char.name || 'Unnamed'}</a>
              <div class="char-class">{fmtLevel(char)}</div>
              {#if char.ancestry}
                <div class="char-sub">{[char.ancestry, char.community].filter(Boolean).join(' · ')}</div>
              {/if}
              {#if char.campaignCode}
                <div class="char-campaign-badge">Campaign: {char.campaignCode}</div>
              {/if}
            </div>
          </div>

          <div class="char-resources">
            <div class="res-item">
              <span class="res-lbl">HP</span>
              <span class="res-val">{char.hp ?? char.maxHP}/{char.maxHP}</span>
            </div>
            <div class="res-item">
              <span class="res-lbl">Stress</span>
              <span class="res-val">{char.stress ?? 0}/{char.maxStress}</span>
            </div>
            <div class="res-item">
              <span class="res-lbl">Hope</span>
              <span class="res-val">{char.hope ?? char.maxHope}/{char.maxHope}</span>
            </div>
            <div class="res-item">
              <span class="res-lbl">Evasion</span>
              <span class="res-val">{char.evasion}</span>
            </div>
          </div>

          <div class="char-foot">
            <a class="btn-c" href="/characters/{encodeURIComponent(char.id)}">Edit Sheet</a>
            <a class="btn-p" href="/characters/{encodeURIComponent(char.id)}/play">Play</a>
            <button class="btn-c btn-danger" onclick={() => deleteCharacter(char)}>Delete</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 18px 22px 60px;
  }
  .pg-head {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 22px;
  }
  .pg-title {
    flex: 1;
    font-family: var(--font-head);
    font-size: 1.5rem;
    margin: 0;
  }
  .back-link { color: var(--text-dim); text-decoration: none; font-size: 0.85rem; }
  .back-link:hover { color: var(--text); }

  .empty-block {
    color: var(--text-dim);
    text-align: center;
    padding: 40px 20px;
    background: var(--surface2);
    border: 1px dashed var(--border);
    border-radius: 6px;
    line-height: 1.8;
  }
  .empty-cta { color: var(--accent); text-decoration: none; font-size: 0.9rem; }
  .empty-cta:hover { text-decoration: underline; }

  .char-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
  }

  .char-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .char-top {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .char-avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
  }
  .char-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .char-avatar-ph {
    width: 100%;
    height: 100%;
    background: var(--surface3);
    border: 2px solid var(--border);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-head);
    font-size: 1.4rem;
    color: var(--text-dim);
  }

  .char-identity { flex: 1; min-width: 0; }
  .char-name {
    font-family: var(--font-head);
    font-size: 1.05rem;
    color: var(--text);
    text-decoration: none;
    display: block;
  }
  .char-name:hover { color: var(--accent); }
  .char-class { font-size: 0.78rem; color: var(--text-dim); margin-top: 2px; }
  .char-sub { font-size: 0.72rem; color: var(--text-faint); }
  .char-campaign-badge {
    display: inline-block;
    margin-top: 4px;
    font-size: 0.65rem;
    font-family: var(--font-mono);
    background: color-mix(in srgb, var(--accent) 15%, var(--surface2));
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: 3px;
    padding: 1px 6px;
  }

  .char-resources {
    display: flex;
    gap: 8px;
    padding: 8px 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  .res-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .res-lbl { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); }
  .res-val { font-family: var(--font-mono); font-size: 0.82rem; font-weight: 600; }

  .char-foot {
    display: flex;
    gap: 6px;
  }
  .char-foot > * {
    flex: 1;
    text-align: center;
    font-size: 0.75rem;
    padding: 5px 6px;
  }

  .btn-danger { color: var(--danger); }
  .btn-danger:hover {
    background: color-mix(in srgb, var(--danger) 15%, var(--surface2));
  }
</style>
