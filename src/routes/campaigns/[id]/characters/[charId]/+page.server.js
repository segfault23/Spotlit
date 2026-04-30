import { redirect, error } from '@sveltejs/kit';
import { getCampaignByCode, getCharacterAsGm } from '$lib/server/user.js';

export const prerender = false;

function decodeCharRef(enc) {
  const decoded = Buffer.from(enc, 'base64url').toString('utf8');
  const idx = decoded.indexOf('|');
  if (idx < 0) return null;
  return { ownerSub: decoded.slice(0, idx), charId: decoded.slice(idx + 1) };
}

export async function load({ locals, params }) {
  if (!locals.user) redirect(302, '/auth/login');
  const campaign = await getCampaignByCode(params.id, locals.user.sub);
  if (!campaign) error(404, 'Campaign not found');

  const ref = decodeCharRef(params.charId);
  if (!ref) error(400, 'Invalid character reference');

  const character = await getCharacterAsGm(locals.user.sub, ref.ownerSub, ref.charId);
  if (!character) error(404, 'Character not found');

  return { campaign, character, ownerSub: ref.ownerSub };
}
