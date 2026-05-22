<script>
  import { goto, invalidateAll } from '$app/navigation';

  // initial: { name, type, cost, body } | null
  // slug:    string | null  (presence => editing existing item)
  // afterSave: optional callback ({ slug, name }) → ... ; if provided, we
  //   run it instead of redirecting (used by the AdversaryEditor inline mode).
  // afterCancel: optional callback (used by inline mode).
  let { initial = null, slug = null, afterSave = null, afterCancel = null } = $props();

  const TYPES = ['Passive', 'Action', 'Reaction', 'Fear'];

  let name   = $state(initial?.name ?? '');
  let type   = $state(initial?.type ?? 'Action');
  let cost   = $state(initial?.cost ?? '');
  let body   = $state(initial?.body ?? '');
  let saving = $state(false);
  let err    = $state('');

  let cls = $derived(
    type === 'Passive'   ? 'passive'  :
    type === 'Reaction'  ? 'reaction' :
    type === 'Fear'      ? 'fear'     :
    'action'
  );

  let dirty = $derived(
    name !== (initial?.name ?? '') ||
    type !== (initial?.type ?? 'Action') ||
    cost !== (initial?.cost ?? '') ||
    body !== (initial?.body ?? '')
  );

  async function save() {
    if (!name.trim()) { err = 'Name is required.'; return; }
    err = '';
    saving = true;
    try {
      const path   = slug ? `/api/features/${encodeURIComponent(slug)}` : '/api/features';
      const method = slug ? 'PUT' : 'POST';
      const res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), type, cost: cost.trim(), body }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      const { slug: newSlug } = await res.json();
      await invalidateAll();
      if (afterSave) afterSave({ slug: newSlug, name: name.trim() });
      else goto('/profile?tab=features');
    } catch (e) {
      err = e.message;
    } finally {
      saving = false;
    }
  }

  async function del() {
    if (!slug) return;
    if (!confirm('Delete this feature? Adversaries that reference it by name will show a "no data" placeholder.')) return;
    saving = true;
    await fetch(`/api/features/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    await invalidateAll();
    goto('/profile?tab=features');
  }

  function cancel() {
    if (dirty && !confirm('Discard changes?')) return;
    if (afterCancel) afterCancel();
    else goto('/profile?tab=features');
  }

  const fieldCls = 'bg-surface2 border border-border rounded px-2 py-1.5 text-text font-body text-[0.88rem] outline-none w-full focus:border-accent-dim';
  const labelCls = 'font-mono text-[0.58rem] uppercase tracking-[1.5px] text-text-dim';
</script>

<div class="feat-editor">
  {#if !afterSave}
    <h1 class="ed-title">{slug ? 'Edit Feature' : 'New Feature'}</h1>
  {/if}

  <div class="ed-cols">
    <div class="ed-fields">
      <div class="flex flex-col gap-1">
        <label for="ed-fname" class={labelCls}>Name</label>
        <input id="ed-fname" type="text" placeholder="e.g. Bone Crush" class={fieldCls} bind:value={name} />
      </div>

      <div class="flex flex-col gap-1">
        <span class="lbl">Type</span>
        <div class="type-row">
          {#each TYPES as t (t)}
            <label class="type-radio">
              <input type="radio" name="ftype-{slug ?? 'new'}" value={t} bind:group={type} />
              <span class="type-pill {t.toLowerCase()}" class:active={type === t}>{t}</span>
            </label>
          {/each}
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <label for="ed-fcost" class={labelCls}>Cost <span class="dim">(optional)</span></label>
        <input id="ed-fcost" type="text" placeholder="e.g. 1 Fear, Mark a Stress" class={fieldCls} bind:value={cost} />
      </div>

      <div class="flex flex-col gap-1">
        <label for="ed-fbody" class={labelCls}>Body</label>
        <textarea id="ed-fbody" rows="8" placeholder="Rules text…" class={fieldCls} bind:value={body}></textarea>
      </div>
    </div>

    <div class="preview-wrap">
      <span class="lbl-sm">Preview</span>
      <div class="fblock {cls} rounded py-1.5 px-2 border">
        <div class="flex items-center gap-1.5 mb-[3px]">
          <span class="ftype font-mono text-[0.54rem] uppercase tracking-[1px] px-[5px] py-px rounded-sm font-medium">{type}</span>
          <span class="font-head text-[0.85rem] text-text">{name || '(unnamed)'}</span>
          {#if cost}<span class="font-mono text-[0.56rem] text-text-faint ml-auto">{cost}</span>{/if}
        </div>
        <div class="text-[0.8rem] text-text-dim leading-[1.4]">{body || '…rules text appears here'}</div>
      </div>
    </div>
  </div>

  {#if err}<div class="ed-err">{err}</div>{/if}

  <div class="flex gap-2 mt-2 items-center">
    <button class="bg-surface2 border border-border rounded px-3 py-[7px] text-text-dim font-body cursor-pointer text-[0.88rem]" onclick={cancel}>Cancel</button>
    {#if slug && !afterSave}
      <button class="bg-surface2 border border-border rounded px-3 py-[7px] font-body cursor-pointer text-[0.88rem] text-danger hover:bg-danger/[.18]" onclick={del}>Delete</button>
    {/if}
    <button class="ml-auto bg-accent-dim border border-accent rounded px-[18px] py-[7px] text-[#f0dfa0] font-body font-semibold cursor-pointer text-[0.88rem] transition-opacity hover:opacity-85 disabled:opacity-50" disabled={saving} onclick={save}>
      {saving ? 'Saving…' : slug ? 'Save Changes' : 'Create Feature'}
    </button>
  </div>
</div>

<style>
  .feat-editor {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ed-cols {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .ed-fields {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  @media (min-width: 900px) {
    .ed-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: start;
    }
  }
  .ed-title {
    margin: 0 0 6px;
    font-family: var(--font-head);
    font-size: 1.4rem;
  }
  .lbl, .lbl-sm {
    display: block;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    margin-bottom: 4px;
    font-weight: 600;
  }
  .lbl-sm { font-size: 0.65rem; }
  .dim { color: var(--text-dim); font-weight: 400; text-transform: none; letter-spacing: 0; }

  .type-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .type-radio {
    cursor: pointer;
  }
  .type-radio input {
    display: none;
  }
  .type-pill {
    display: inline-block;
    padding: 5px 12px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-dim);
    transition: all 0.1s;
  }
  .type-pill.passive  { color: var(--feat-passive,  #6ec38c); }
  .type-pill.action   { color: var(--feat-action,   #d8a040); }
  .type-pill.reaction { color: var(--feat-reaction, #5aafdd); }
  .type-pill.fear     { color: var(--feat-fear,     #d64040); }
  .type-pill.active {
    background: color-mix(in srgb, currentColor 22%, var(--surface2));
    border-color: currentColor;
  }

  .fblock.passive  { background: var(--f-passive);  border-color: #2a5070; }
  .fblock.action   { background: var(--f-action);   border-color: #5a4010; }
  .fblock.reaction { background: var(--f-reaction); border-color: #5a3010; }
  .fblock.fear     { background: var(--f-fear);     border-color: #6a1a08; }

  .fblock.passive  .ftype { color: var(--f-passive-t);  background: rgba(90,171,223,.12); }
  .fblock.action   .ftype { color: var(--f-action-t);   background: rgba(200,152,48,.12); }
  .fblock.reaction .ftype { color: var(--f-reaction-t); background: rgba(208,120,50,.12); }
  .fblock.fear     .ftype { color: var(--f-fear-t);     background: rgba(224,64,32,.12); }

  .preview-wrap {
    padding: 10px;
    background: var(--surface2);
    border-radius: 4px;
    border: 1px solid var(--border);
  }

  .ed-err {
    color: var(--feat-fear, #d64040);
    font-size: 0.8rem;
    padding: 6px 10px;
    background: color-mix(in srgb, var(--feat-fear, #d64040) 12%, transparent);
    border-radius: 3px;
  }
</style>
