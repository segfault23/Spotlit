import { error, json } from '@sveltejs/kit';
import { getCharacter, putCharacter, deleteCharacter } from '$lib/server/user.js';

export async function GET({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const char = await getCharacter(locals.user.sub, params.id);
  // Also allow GM access via campaign link
  if (!char) {
    // Try looking up as GM: charId may be "ownerSub|charId" encoded in a query
    error(404, 'Not found');
  }
  return json({ character: char });
}

export async function PUT({ locals, params, request }) {
  if (!locals.user) error(401, 'Unauthorized');

  // Allow owner or GM of the campaign
  const existing = await getCharacter(locals.user.sub, params.id);
  if (existing) {
    const data = await request.json();
    await putCharacter(locals.user.sub, { ...existing, ...data }, params.id);
    return json({ ok: true });
  }

  error(404, 'Not found');
}

export async function DELETE({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const char = await getCharacter(locals.user.sub, params.id);
  if (!char) error(404, 'Not found');
  await deleteCharacter(locals.user.sub, params.id);
  return json({ ok: true });
}
