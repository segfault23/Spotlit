import { json, error } from '@sveltejs/kit';
import { listCustomCreatures, putCustomCreature } from '$lib/server/user.js';

export async function GET({ locals }) {
  if (!locals.user) error(401, 'Unauthorized');
  const creatures = await listCustomCreatures(locals.user.sub);
  return json(creatures);
}

export async function POST({ locals, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const creature = await request.json();
  if (!creature.name?.trim()) error(400, 'name required');
  const slug = await putCustomCreature(locals.user.sub, creature);
  return json({ slug }, { status: 201 });
}
