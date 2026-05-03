import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { cookieDefaults } from '../../../hooks.server.js';

export function GET({ cookies, url, request }) {
  const opts = { path: '/', ...(cookieDefaults.domain ? { domain: cookieDefaults.domain } : {}) };
  cookies.delete('id_token',      opts);
  cookies.delete('refresh_token', opts);
  cookies.delete('oauth_state',   opts);

  const forwardedHost = request.headers.get('x-forwarded-host');
  const origin = forwardedHost ? `https://${forwardedHost}` : url.origin;

  const params = new URLSearchParams({
    client_id: env.COGNITO_CLIENT_ID,
    logout_uri: origin,
  });

  redirect(302, `${env.COGNITO_DOMAIN}/logout?${params}`);
}
