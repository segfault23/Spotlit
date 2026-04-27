import { redirect, error } from '@sveltejs/kit';
import { exchangeCode, verifyState } from '$lib/server/auth.js';
import { cookieDefaults } from '../../../hooks.server.js';

export async function GET({ url, cookies }) {
  const code  = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  console.log('[auth/callback] params:', {
    hasCode: !!code,
    hasState: !!state,
    error: url.searchParams.get('error'),
    error_description: url.searchParams.get('error_description'),
    origin: url.origin,
  });

  if (!code || !await verifyState(state)) {
    error(400, 'Invalid OAuth state');
  }

  let tokens;
  try {
    tokens = await exchangeCode(code, `${url.origin}/auth/callback`);
  } catch (e) {
    error(500, `Auth failed: ${e.message}`);
  }

  cookies.set('id_token', tokens.id_token, {
    ...cookieDefaults,
    maxAge: tokens.expires_in ?? 3600,
  });

  if (tokens.refresh_token) {
    // refresh_token only present on initial code exchange, not refreshes
    cookies.set('refresh_token', tokens.refresh_token, {
      ...cookieDefaults,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  redirect(302, '/');
}
