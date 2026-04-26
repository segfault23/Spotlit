import { json, error } from '@sveltejs/kit';
import { getRoster, putRoster } from '$lib/server/user.js';

export async function GET({ locals }) {
  if (!locals.user) error(401, 'Unauthorized');
  const characters = await getRoster(locals.user.sub);
  return json({ characters });
}

export async function PUT({ locals, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const { characters } = await request.json();
  await putRoster(locals.user.sub, characters ?? []);
  return new Response(null, { status: 204 });
}
