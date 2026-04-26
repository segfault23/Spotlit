import { json, error } from '@sveltejs/kit';
import { getCustomFeature, putCustomFeature, deleteCustomFeature } from '$lib/server/user.js';

export async function GET({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const item = await getCustomFeature(locals.user.sub, params.slug);
  if (!item) error(404, 'Not found');
  return json(item);
}

export async function PUT({ locals, params, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const feature = await request.json();
  if (!feature.name?.trim()) error(400, 'name required');
  const slug = await putCustomFeature(locals.user.sub, feature, params.slug);
  return json({ slug });
}

export async function DELETE({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  await deleteCustomFeature(locals.user.sub, params.slug);
  return new Response(null, { status: 204 });
}
