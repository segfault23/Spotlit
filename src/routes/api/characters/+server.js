import { error, json } from '@sveltejs/kit';
import { listMyCharacters, putCharacter } from '$lib/server/user.js';

export async function GET({ locals }) {
  if (!locals.user) error(401, 'Unauthorized');
  const characters = await listMyCharacters(locals.user.sub);
  return json({ characters });
}

export async function POST({ locals, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const data = await request.json();
  const id = await putCharacter(locals.user.sub, data);
  return json({ id }, { status: 201 });
}
