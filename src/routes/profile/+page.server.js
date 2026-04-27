import { redirect } from '@sveltejs/kit';
import { listEncounters, listCustomCreatures, listCustomFeatures } from '$lib/server/user.js';

export const prerender = false;

export async function load({ locals, url }) {
  if (!locals.user) {
    // Bounce anonymous visitors to login, then back here
    redirect(302, `/auth/login?next=${encodeURIComponent(url.pathname + url.search)}`);
  }

  const [encounters, customCreatures, customFeatures] = await Promise.all([
    listEncounters(locals.user.sub),
    listCustomCreatures(locals.user.sub),
    listCustomFeatures(locals.user.sub),
  ]);

  // For encounters, surface a creature count for the list view without
  // having to fetch each one individually. The list endpoint only stores
  // name/updatedAt, so we keep it as-is here and let the page show date.
  return {
    encounters,
    customCreatures,
    customFeatures,
  };
}
