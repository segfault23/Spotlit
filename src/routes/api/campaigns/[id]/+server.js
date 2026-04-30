import { error, json } from '@sveltejs/kit';
import { getCampaignByCode, putCampaign, deleteCampaign } from '$lib/server/user.js';

// params.id is the joinCode (6-char URL-safe)
export async function GET({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const campaign = await getCampaignByCode(params.id, locals.user.sub);
  if (!campaign) error(404, 'Not found');
  return json({ campaign });
}

export async function PUT({ locals, params, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const campaign = await getCampaignByCode(params.id, locals.user.sub);
  if (!campaign) error(404, 'Not found');
  const data = await request.json();
  await putCampaign(locals.user.sub, data, campaign.id);
  return json({ ok: true });
}

export async function DELETE({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const campaign = await getCampaignByCode(params.id, locals.user.sub);
  if (!campaign) error(404, 'Not found');
  await deleteCampaign(locals.user.sub, campaign.id);
  return json({ ok: true });
}
