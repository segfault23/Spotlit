import { error, json } from '@sveltejs/kit';
import { listCampaigns, putCampaign } from '$lib/server/user.js';

export async function GET({ locals }) {
  if (!locals.user) error(401, 'Unauthorized');
  const campaigns = await listCampaigns(locals.user.sub);
  return json({ campaigns });
}

export async function POST({ locals, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const data = await request.json();
  const { id, joinCode } = await putCampaign(locals.user.sub, data);
  return json({ id, joinCode }, { status: 201 });
}
