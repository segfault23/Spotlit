import { redirect, error } from '@sveltejs/kit';
import { getCampaignByCode } from '$lib/server/user.js';
import { listAncestries, listCommunities, listSubclasses } from '$lib/server/content';

export const prerender = false;

export async function load({ locals, params }) {
  if (!locals.user) redirect(302, '/auth/login');
  const [campaign, ancestries, communities, subclasses] = await Promise.all([
    getCampaignByCode(params.id, locals.user.sub),
    listAncestries(),
    listCommunities(),
    listSubclasses(),
  ]);
  if (!campaign) error(404, 'Campaign not found');
  return { campaign, ancestries, communities, subclasses };
}
