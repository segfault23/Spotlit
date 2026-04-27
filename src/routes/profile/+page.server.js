import { redirect } from '@sveltejs/kit';
import { listEncounters } from '$lib/server/user.js';

export const prerender = false;

export async function load({ locals, url, parent }) {
  if (!locals.user) {
    redirect(302, `/auth/login?next=${encodeURIComponent(url.pathname + url.search)}`);
  }

  // Run parent layout fetch and encounters query in parallel. The layout already
  // fetches customCreatures and customFeatures, so we reuse them here instead of
  // issuing two extra DynamoDB queries on every profile page load.
  const [{ customCreatures, customFeatures }, encounters] = await Promise.all([
    parent(),
    listEncounters(locals.user.sub),
  ]);

  return { encounters, customCreatures, customFeatures };
}
