import { redirect } from '@sveltejs/kit';

export const prerender = false;

export async function load({ locals }) {
  if (!locals.user) redirect(302, '/auth/login');
  return {};
}
