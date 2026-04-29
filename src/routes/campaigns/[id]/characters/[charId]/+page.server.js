import { redirect, error } from '@sveltejs/kit';
import { getCampaign, getCharacterAsGm } from '$lib/server/user.js';

export const prerender = false;

export async function load({ locals, params }) {
  if (!locals.user) redirect(302, '/auth/login');
  const campaign = await getCampaign(locals.user.sub, params.id);
  if (!campaign) error(404, 'Campaign not found');

  // charId param is "<ownerSub>|<characterSk>"
  const [ownerSub, ...rest] = params.charId.split('|');
  const charId = rest.join('|');
  if (!ownerSub || !charId) error(400, 'Invalid character reference');

  const character = await getCharacterAsGm(locals.user.sub, ownerSub, charId);
  if (!character) error(404, 'Character not found');

  return { campaign, character, ownerSub };
}
