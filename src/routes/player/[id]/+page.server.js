import { error } from '@sveltejs/kit';
import { getCharacter } from '$lib/server/user.js';

export const prerender = false;

export async function load({ locals, params }) {
  const charSk = Buffer.from(params.id, 'base64url').toString('utf8');
  const character = await getCharacter(locals.user.sub, charSk);
  if (!character) error(404, 'Character not found');
  return { character };
}
