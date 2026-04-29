import { redirect } from '@sveltejs/kit';
import { listMyCharacters } from '$lib/server/user.js';

export const prerender = false;

export async function load({ locals }) {
  if (!locals.user) redirect(302, '/auth/login');
  const characters = await listMyCharacters(locals.user.sub);
  return { characters };
}
