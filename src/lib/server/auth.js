// Cognito OAuth helpers — token exchange, refresh, and client secret caching.
// The client secret is never stored in env vars; Lambda fetches it once from
// Cognito's DescribeUserPoolClient API and caches it for the process lifetime.

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
