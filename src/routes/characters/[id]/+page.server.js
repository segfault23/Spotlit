import { redirect, error } from '@sveltejs/kit';
import { getCharacter } from '$lib/server/user.js';
import { listAncestries, listCommunities, listSubclasses } from '$lib/server/content';

export const prerender = false;

export async function load({ locals, params }) {
  if (!locals.user) redirect(302, '/auth/login');
  const charSk = Buffer.from(params.id, 'base64url').toString('utf8');
  const [character, ancestries, communities, subclasses] = await Promise.all([
    getCharacter(locals.user.sub, charSk),
    listAncestries(),
    listCommunities(),
    listSubclasses(),
  ]);
  if (!character) error(404, 'Character not found');
  return { character, ancestries, communities, subclasses };
}
