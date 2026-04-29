import { error, json } from '@sveltejs/kit';
import { getCampaignByJoinCode, getCharacter, putCharacter } from '$lib/server/user.js';

// Resolve a join code → campaign info (public-ish, just needs auth)
export async function GET({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const campaign = await getCampaignByJoinCode(params.code.toUpperCase());
  if (!campaign) error(404, 'Invalid join code');
  return json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      joinCode: campaign.joinCode,
      gmSub: campaign.gmSub,
    },
  });
}

// Player links one of their characters (or a new one) to the campaign
export async function POST({ locals, params, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const code = params.code.toUpperCase();
  const campaign = await getCampaignByJoinCode(code);
  if (!campaign) error(404, 'Invalid join code');

  const { charId } = await request.json();
  if (!charId) error(400, 'charId required');

  const char = await getCharacter(locals.user.sub, charId);
  if (!char) error(404, 'Character not found');

  // Link the character to this campaign
  await putCharacter(locals.user.sub, {
    ...char,
    campaignCode: code,
    campaignGmSub: campaign.gmSub,
  }, charId);

  return json({ ok: true });
}
