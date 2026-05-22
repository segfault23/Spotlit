import { redirect, error } from '@sveltejs/kit';
import { getCampaignByJoinCode } from '$lib/server/user.js';

export const prerender = false;

export async function load({ locals, params }) {
  if (!locals.user) {
    redirect(302, `/auth/login?next=${encodeURIComponent(`/join/${params.code}`)}`);
  }

  const code = params.code.toUpperCase();
  const campaign = await getCampaignByJoinCode(code);
  if (!campaign) error(404, 'Invalid or expired join code');

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      joinCode: campaign.joinCode,
      gmSub: campaign.gmSub,
    },
    code,
  };
}
