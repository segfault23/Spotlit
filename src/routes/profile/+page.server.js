import { redirect } from '@sveltejs/kit';
import { listEncounters, listCampaigns } from '$lib/server/user.js';

export const prerender = false;

export async function load({ locals, url, parent }) {
  if (!locals.user) {
    redirect(302, `/auth/login?next=${encodeURIComponent(url.pathname + url.search)}`);
  }

  const [{ customCreatures, customFeatures }, encounters, campaigns] = await Promise.all([
    parent(),
    listEncounters(locals.user.sub),
    listCampaigns(locals.user.sub),
  ]);

  return { encounters, customCreatures, customFeatures, campaigns };
}
