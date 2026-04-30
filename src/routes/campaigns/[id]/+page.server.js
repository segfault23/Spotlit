import { redirect, error } from '@sveltejs/kit';
import { getCampaignByCode, listCampaignCharacters } from '$lib/server/user.js';

export const prerender = false;

export async function load({ locals, params }) {
  if (!locals.user) redirect(302, '/auth/login');
  const campaign = await getCampaignByCode(params.id, locals.user.sub);
  if (!campaign) error(404, 'Campaign not found');
  const characters = await listCampaignCharacters(campaign.joinCode);
  return { campaign, characters };
}
