import { json, error } from '@sveltejs/kit';
import { loadEncounter, saveEncounter, deleteEncounter } from '$lib/server/user.js';

export async function GET({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const item = await loadEncounter(locals.user.sub, decodeURIComponent(params.id));
  if (!item) error(404, 'Not found');
  return json({ state: item.state });
}

export async function PUT({ locals, params, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const state = await request.json();
  await saveEncounter(locals.user.sub, state, decodeURIComponent(params.id));
  return new Response(null, { status: 204 });
}

export async function DELETE({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  await deleteEncounter(locals.user.sub, decodeURIComponent(params.id));
  return new Response(null, { status: 204 });
}
