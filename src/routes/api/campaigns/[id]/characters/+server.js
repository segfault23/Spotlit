import { error, json } from '@sveltejs/kit';
import { getCampaignByCode, listCampaignCharacters, putCharacter } from '$lib/server/user.js';

// params.id is the joinCode (6-char URL-safe)

export async function GET({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const campaign = await getCampaignByCode(params.id, locals.user.sub);
  if (!campaign) error(404, 'Campaign not found');
  const characters = await listCampaignCharacters(campaign.joinCode);
  return json({ characters });
}

export async function POST({ locals, params, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const campaign = await getCampaignByCode(params.id, locals.user.sub);
  if (!campaign) error(404, 'Campaign not found');
  const data = await request.json();
  const id = await putCharacter(locals.user.sub, {
    ...data,
    campaignCode: campaign.joinCode,
    campaignGmSub: locals.user.sub,
  });
  return json({ id }, { status: 201 });
}
