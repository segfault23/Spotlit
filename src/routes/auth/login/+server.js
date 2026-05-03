import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { signState } from '$lib/server/auth.js';

export async function GET({ url, request }) {
  // Dev bypass — if no Cognito config, just go to the app root
  if (!env.COGNITO_CLIENT_ID || !env.COGNITO_DOMAIN) {
    redirect(302, url.searchParams.get('next') ?? '/');
  }

  const state = await signState();

  // x-forwarded-host is set by the CloudFront Function; PUBLIC_ORIGIN env var
  // would otherwise fix url.origin to the main domain for all subdomains.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const origin = forwardedHost ? `https://${forwardedHost}` : url.origin;

  const params = new URLSearchParams({
    client_id: env.COGNITO_CLIENT_ID,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: `${origin}/auth/callback`,
    state,
  });

  redirect(302, `${env.COGNITO_DOMAIN}/oauth2/authorize?${params}`);
}
