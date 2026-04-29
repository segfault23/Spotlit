import { error, json } from '@sveltejs/kit';
import { getCampaign, listCampaignCharacters, putCharacter } from '$lib/server/user.js';

// GM lists all characters in their campaign
export async function GET({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const campaign = await getCampaign(locals.user.sub, params.id);
  if (!campaign) error(404, 'Campaign not found');
  const characters = await listCampaignCharacters(campaign.joinCode);
  return json({ characters });
}

// GM creates a character on behalf of a player
export async function POST({ locals, params, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const campaign = await getCampaign(locals.user.sub, params.id);
  if (!campaign) error(404, 'Campaign not found');
  const data = await request.json();
  const id = await putCharacter(locals.user.sub, {
    ...data,
    campaignCode: campaign.joinCode,
    campaignGmSub: locals.user.sub,
  });
  return json({ id }, { status: 201 });
}
