import { json, error } from '@sveltejs/kit';
import { listCustomFeatures, putCustomFeature } from '$lib/server/user.js';

export async function GET({ locals }) {
  if (!locals.user) error(401, 'Unauthorized');
  const features = await listCustomFeatures(locals.user.sub);
  return json(features);
}

export async function POST({ locals, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const feature = await request.json();
  if (!feature.name?.trim()) error(400, 'name required');
  const slug = await putCustomFeature(locals.user.sub, feature);
  return json({ slug }, { status: 201 });
}
