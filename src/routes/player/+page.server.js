import { listMyCharacters } from '$lib/server/user.js';

export const prerender = false;

export async function load({ locals }) {
  const characters = await listMyCharacters(locals.user.sub);
  return { characters };
}
