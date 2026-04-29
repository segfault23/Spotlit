import { redirect, error } from '@sveltejs/kit';
import { getCharacter } from '$lib/server/user.js';

export const prerender = false;

export async function load({ locals, params }) {
  if (!locals.user) redirect(302, '/auth/login');
  const character = await getCharacter(locals.user.sub, params.id);
  if (!character) error(404, 'Character not found');
  return { character };
}
