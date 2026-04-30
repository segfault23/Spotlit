import { error, json } from '@sveltejs/kit';
import { getCampaignByCode, getCharacterAsGm, putCharacter, deleteCharacter } from '$lib/server/user.js';

// params.id     = campaign joinCode (6-char URL-safe)
// params.charId = base64url( ownerSub + "|" + characterSk )
function decodeCharRef(enc) {
  const decoded = Buffer.from(enc, 'base64url').toString('utf8');
  const idx = decoded.indexOf('|');
  if (idx < 0) return null;
  return { ownerSub: decoded.slice(0, idx), charId: decoded.slice(idx + 1) };
}

async function resolveCampaignAndChar({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const campaign = await getCampaignByCode(params.id, locals.user.sub);
  if (!campaign) error(404, 'Campaign not found');

  const ref = decodeCharRef(params.charId);
  if (!ref) error(400, 'Invalid character reference');

  const char = await getCharacterAsGm(locals.user.sub, ref.ownerSub, ref.charId);
  if (!char) error(404, 'Character not found');
  return { campaign, char, ownerSub: ref.ownerSub, charId: ref.charId };
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
