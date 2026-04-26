import { error } from '@sveltejs/kit';
import { deleteCustomCreature } from '$lib/server/user.js';

export async function DELETE({ locals, params }) {
  if (!locals.user) error(401, 'Unauthorized');
  await deleteCustomCreature(locals.user.sub, params.slug);
  return new Response(null, { status: 204 });
}
