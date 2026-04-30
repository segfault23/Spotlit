import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { signState } from '$lib/server/auth.js';

export async function GET({ url }) {
  // Dev bypass — if no Cognito config, just go to the app root
  if (!env.COGNITO_CLIENT_ID || !env.COGNITO_DOMAIN) {
    redirect(302, url.searchParams.get('next') ?? '/');
  }

  const state = await signState();

  const params = new URLSearchParams({
    client_id: env.COGNITO_CLIENT_ID,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: `${url.origin}/auth/callback`,
    state,
  });

  redirect(302, `${env.COGNITO_DOMAIN}/oauth2/authorize?${params}`);
}
