import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { randomBytes } from 'crypto';
import { cookieDefaults } from '../../../hooks.server.js';

export function GET({ cookies, url }) {
  const state = randomBytes(16).toString('hex');
  cookies.set('oauth_state', state, { ...cookieDefaults, maxAge: 600 });

  const params = new URLSearchParams({
    client_id: env.COGNITO_CLIENT_ID,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: `${url.origin}/auth/callback`,
    state,
  });

  redirect(302, `${env.COGNITO_DOMAIN}/oauth2/authorize?${params}`);
}
