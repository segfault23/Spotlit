import { error, json } from '@sveltejs/kit';
import { getCampaign, getCharacterAsGm, putCharacter, deleteCharacter } from '$lib/server/user.js';

async function resolveCampaignAndChar({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const campaign = await getCampaign(locals.user.sub, params.id);
  if (!campaign) error(404, 'Campaign not found');

  // charId encodes ownerSub and character id: "<ownerSub>|<charId>"
  const [ownerSub, charId] = params.charId.split('|');
  if (!ownerSub || !charId) error(400, 'Invalid charId');

  const char = await getCharacterAsGm(locals.user.sub, ownerSub, charId);
  if (!char) error(404, 'Character not found');
  return { campaign, char, ownerSub, charId };
}

export async function GET({ locals, params }) {
  const { char } = await resolveCampaignAndChar({ locals, params });
  return json({ character: char });
}

export async function PUT({ locals, params, request }) {
  const { ownerSub, charId } = await resolveCampaignAndChar({ locals, params });
  const data = await request.json();
  await putCharacter(ownerSub, data, charId);
  return json({ ok: true });
}

export async function DELETE({ locals, params }) {
  const { ownerSub, charId } = await resolveCampaignAndChar({ locals, params });
  await deleteCharacter(ownerSub, charId);
  return json({ ok: true });
}
