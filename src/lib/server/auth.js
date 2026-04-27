// Cognito OAuth helpers — token exchange, refresh, and client secret caching.
// The client secret is never stored in env vars; Lambda fetches it once from
// Cognito's DescribeUserPoolClient API and caches it for the process lifetime.

import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoIdp = new CognitoIdentityProviderClient({});
let _clientSecret = null;

export async function getClientSecret() {
  if (_clientSecret) return _clientSecret;
  const { UserPoolClient } = await cognitoIdp.send(
    new DescribeUserPoolClientCommand({
      UserPoolId: env.COGNITO_USER_POOL_ID,
      ClientId: env.COGNITO_CLIENT_ID,
    }),
  );
  _clientSecret = UserPoolClient.ClientSecret;
  return _clientSecret;
}

function basicAuth(clientId, secret) {
  return `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`;
}

export async function exchangeCode(code, redirectUri) {
  const secret = await getClientSecret();
  const res = await fetch(`${env.COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuth(env.COGNITO_CLIENT_ID, secret),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

// HMAC-signed OAuth state, replacing the cookie-based approach.
// Cookies were unreliable through the CloudFront layer fronting the Lambda
// (Set-Cookie was being stripped by the Managed-CachingDisabled cache policy).
// The signed state proves to /auth/callback that the value came from us and
// hasn't expired, without needing a round-trip cookie.

export async function signState() {
  const secret = await getClientSecret();
  const nonce = crypto.randomBytes(12).toString('base64url');
  const exp   = String(Math.floor(Date.now() / 1000) + 600); // 10 min
  const payload = `${nonce}.${exp}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export async function verifyState(state) {
  if (!state || typeof state !== 'string') {
    console.error('[verifyState] fail: missing or non-string state');
    return false;
  }
  const parts = state.split('.');
  if (parts.length !== 3) {
    console.error('[verifyState] fail: wrong number of parts', parts.length);
    return false;
  }
  const [nonce, exp, sig] = parts;
  if (!nonce || !exp || !sig) {
    console.error('[verifyState] fail: empty part nonce=%s exp=%s sig=%s', nonce, exp, sig);
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  if (Number(exp) < now) {
    console.error('[verifyState] fail: expired exp=%s now=%s', exp, now);
    return false;
  }

  let secret;
  try {
    secret = await getClientSecret();
  } catch (e) {
    console.error('[verifyState] fail: getClientSecret threw', e.message);
    return false;
  }

  if (!secret) {
    console.error('[verifyState] fail: secret is empty');
    return false;
  }

  const expected = crypto.createHmac('sha256', secret).update(`${nonce}.${exp}`).digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) {
    console.error('[verifyState] fail: sig length mismatch got=%s want=%s', sigBuf.length, expBuf.length);
    return false;
  }
  const match = crypto.timingSafeEqual(sigBuf, expBuf);
  if (!match) {
    console.error('[verifyState] fail: HMAC mismatch — secret first 4 chars: %s', String(secret).slice(0, 4));
  }
  return match;
}

export async function refreshTokens(refreshToken) {
  const secret = await getClientSecret();
  const res = await fetch(`${env.COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuth(env.COGNITO_CLIENT_ID, secret),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });
  if (!res.ok) return null;
  return res.json();
}
