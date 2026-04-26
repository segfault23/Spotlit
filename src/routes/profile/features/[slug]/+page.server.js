import { error, redirect } from '@sveltejs/kit';
import { getCustomFeature } from '$lib/server/user.js';

export const prerender = false;

export async function load({ locals, params, url }) {
  if (!locals.user) {
    redirect(302, `/auth/login?next=${encodeURIComponent(url.pathname)}`);
  }
  const item = await getCustomFeature(locals.user.sub, params.slug);
  if (!item) error(404, 'Feature not found in your library');
  return { feature: item };
}
