import { redirect, error } from '@sveltejs/kit';
import { getCampaign } from '$lib/server/user.js';

export const prerender = false;

export async function load({ locals, params }) {
  if (!locals.user) redirect(302, '/auth/login');
  const campaign = await getCampaign(locals.user.sub, params.id);
  if (!campaign) error(404, 'Campaign not found');
  return { campaign };
}
