import { redirect, error } from '@sveltejs/kit';
import { getCampaignByCode, getCharacterAsGm } from '$lib/server/user.js';
import { listAncestries, listCommunities, listSubclasses } from '$lib/server/content';

export const prerender = false;

function decodeCharRef(enc) {
  const decoded = Buffer.from(enc, 'base64url').toString('utf8');
  const idx = decoded.indexOf('|');
  if (idx < 0) return null;
  return { ownerSub: decoded.slice(0, idx), charId: decoded.slice(idx + 1) };
}

export async function load({ locals, params }) {
  if (!locals.user) redirect(302, '/auth/login');
  const ref = decodeCharRef(params.charId);
  if (!ref) error(400, 'Invalid character reference');

  const [campaign, character, ancestries, communities, subclasses] = await Promise.all([
    getCampaignByCode(params.id, locals.user.sub),
    getCharacterAsGm(locals.user.sub, ref.ownerSub, ref.charId),
    listAncestries(),
    listCommunities(),
    listSubclasses(),
  ]);
  if (!campaign) error(404, 'Campaign not found');
  if (!character) error(404, 'Character not found');

  return { campaign, character, ownerSub: ref.ownerSub, ancestries, communities, subclasses };
}
