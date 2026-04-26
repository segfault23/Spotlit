import { json, error } from '@sveltejs/kit';
import { listEncounters, saveEncounter } from '$lib/server/user.js';

export async function GET({ locals }) {
  if (!locals.user) error(401, 'Unauthorized');
  const encounters = await listEncounters(locals.user.sub);
  return json(encounters);
}

export async function POST({ locals, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const state = await request.json();
  const id = await saveEncounter(locals.user.sub, state);
  return json({ id }, { status: 201 });
}
