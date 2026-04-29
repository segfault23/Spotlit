import { error, json } from '@sveltejs/kit';
import { getCampaign, putCampaign, deleteCampaign } from '$lib/server/user.js';

export async function GET({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const campaign = await getCampaign(locals.user.sub, params.id);
  if (!campaign) error(404, 'Not found');
  return json({ campaign });
}

export async function PUT({ locals, params, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const data = await request.json();
  await putCampaign(locals.user.sub, data, params.id);
  return json({ ok: true });
}

export async function DELETE({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const existing = await getCampaign(locals.user.sub, params.id);
  if (!existing) error(404, 'Not found');
  await deleteCampaign(locals.user.sub, params.id);
  return json({ ok: true });
}
