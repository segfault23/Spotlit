import { error, redirect } from '@sveltejs/kit';
import { getCustomCreature } from '$lib/server/user.js';

export const prerender = false;

export async function load({ locals, params, url }) {
  if (!locals.user) {
    redirect(302, `/auth/login?next=${encodeURIComponent(url.pathname)}`);
  }
  const item = await getCustomCreature(locals.user.sub, params.slug);
  if (!item) error(404, 'Adversary not found in your library');
  return { creature: item };
}
