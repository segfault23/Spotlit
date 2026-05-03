import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { env } from '$env/dynamic/private';
import { refreshTokens } from '$lib/server/auth.js';

const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

export const cookieDefaults = {
  httpOnly: true,
  secure: isLambda,
  sameSite: 'lax',
  path: '/',
};

let verifier = null;
if (env.COGNITO_USER_POOL_ID && env.COGNITO_CLIENT_ID) {
  verifier = CognitoJwtVerifier.create({
    userPoolId: env.COGNITO_USER_POOL_ID,
    clientId: env.COGNITO_CLIENT_ID,
    tokenUse: 'id',
  });
}

export async function handle({ event, resolve }) {
  event.locals.user = null;

  // Detect player subdomain; redirect bare / to /player
  const host = event.request.headers.get('x-forwarded-host') ?? event.url.hostname;
  event.locals.isPlayerDomain = host.startsWith('player.');
  if (event.locals.isPlayerDomain && event.url.pathname === '/') {
    return new Response(null, { status: 302, headers: { location: '/player' } });
  }

  // Local dev: DEV_USER=sub:email:name skips all Cognito auth
  if (env.DEV_USER) {
    const [sub, email = 'dev@local', name = 'Dev User'] = env.DEV_USER.split(':');
    event.locals.user = { sub, email, name };
    return resolve(event);
  }

  if (!verifier) return resolve(event);

  const idToken = event.cookies.get('id_token');
  if (!idToken) return resolve(event);

  try {
    const payload = await verifier.verify(idToken);
    event.locals.user = userFromPayload(payload);
  } catch {
    // Token expired — attempt silent refresh
    const refreshToken = event.cookies.get('refresh_token');
    if (!refreshToken) {
      clearAuthCookies(event.cookies);
      return resolve(event);
    }
    try {
      const tokens = await refreshTokens(refreshToken);
      if (!tokens?.id_token) {
        clearAuthCookies(event.cookies);
        return resolve(event);
      }
      event.cookies.set('id_token', tokens.id_token, {
        ...cookieDefaults,
        maxAge: tokens.expires_in ?? 3600,
      });
      const payload = await verifier.verify(tokens.id_token);
      event.locals.user = userFromPayload(payload);
    } catch {
      clearAuthCookies(event.cookies);
    }
  }

  return resolve(event);
}

function userFromPayload(payload) {
  return {
    sub: payload.sub,
    email: payload.email ?? '',
    name: payload.name || payload.given_name || payload.email || 'User',
  };
}

function clearAuthCookies(cookies) {
  cookies.delete('id_token', { path: '/' });
  cookies.delete('refresh_token', { path: '/' });
}
