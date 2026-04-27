<script>
  import AdversaryEditor from '$lib/components/AdversaryEditor.svelte';
</script>

<div class="ed-page">
  <a class="ed-back" href="/profile?tab=adversaries">← Back to library</a>
  <AdversaryEditor />
</div>

<style>
  .ed-page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 18px 22px 60px;
  }
  .ed-back {
    display: inline-block;
    color: var(--text-dim);
    font-size: 0.85rem;
    text-decoration: none;
    margin-bottom: 14px;
  }
  .ed-back:hover {
    color: var(--text);
  }
</style>
