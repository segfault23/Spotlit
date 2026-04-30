import { error, json } from '@sveltejs/kit';
import { getCharacter, putCharacter, deleteCharacter } from '$lib/server/user.js';

// params.id is base64url( characterSk )
function decodeId(enc) {
  return Buffer.from(enc, 'base64url').toString('utf8');
}

export async function GET({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const char = await getCharacter(locals.user.sub, decodeId(params.id));
  if (!char) error(404, 'Not found');
  return json({ character: char });
}

export async function PUT({ locals, params, request }) {
  if (!locals.user) error(401, 'Unauthorized');
  const charSk = decodeId(params.id);
  const existing = await getCharacter(locals.user.sub, charSk);
  if (!existing) error(404, 'Not found');
  const data = await request.json();
  await putCharacter(locals.user.sub, { ...existing, ...data }, charSk);
  return json({ ok: true });
}

export async function DELETE({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  const charSk = decodeId(params.id);
  const char = await getCharacter(locals.user.sub, charSk);
  if (!char) error(404, 'Not found');
  await deleteCharacter(locals.user.sub, charSk);
  return json({ ok: true });
}
