import { error, json } from '@sveltejs/kit';
import { getCustomItem, putCustomItem, deleteCustomItem } from '$lib/server/user.js';

export async function GET({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const item = await getCustomItem(locals.user.sub, params.slug);
  if (!item) error(404, 'Not found');
  return json({ item });
}

export async function PUT({ locals, params, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const data = await request.json();
  await putCustomItem(locals.user.sub, data, params.slug);
  return json({ ok: true });
}

export async function DELETE({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  await deleteCustomItem(locals.user.sub, params.slug);
  return json({ ok: true });
}
