import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export function GET({ cookies, url }) {
  cookies.delete('id_token',      { path: '/' });
  cookies.delete('refresh_token', { path: '/' });
  cookies.delete('oauth_state',   { path: '/' });

  const params = new URLSearchParams({
    client_id: env.COGNITO_CLIENT_ID,
    logout_uri: url.origin,
  });

  redirect(302, `${env.COGNITO_DOMAIN}/logout?${params}`);
}
