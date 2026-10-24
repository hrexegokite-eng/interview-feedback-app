import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSession } from '@/lib/auth';

function getRedirectUri(req) {
  if (process.env.APP_URL) {
    const base = process.env.APP_URL.replace(/\/+$/, '');
    return `${base}/api/auth/google/callback`;
  }
  const proto = req.headers.get('x-forwarded-proto') || (req.nextUrl.protocol ? req.nextUrl.protocol.replace(':', '') : 'http');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  return `${proto}://${host}/api/auth/google/callback`;
}

export async function GET(req) {
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const redirectUri = getRedirectUri(req);
  const proto = req.headers.get('x-forwarded-proto') || (url.protocol ? url.protocol.replace(':', '') : 'http');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  const baseUrl = `${proto}://${host}`;

  if (error || !code) {
    const msg = error ? `Google sign in error: ${error}` : 'Google sign in cancelled';
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, baseUrl));
  }

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=Google+OAuth+credentials+not+configured+in+environment', baseUrl));
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Failed to exchange code:', tokenData);
      const detail = tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with Google';
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(detail)}`, baseUrl));
    }

    // 2. Fetch Google profile
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userRes.json();

    if (!userRes.ok || !profile.email) {
      return NextResponse.redirect(new URL('/login?error=Unable+to+retrieve+Google+profile', baseUrl));
    }

    // 3. Create session JWT
    const sessionToken = await createSession(profile.email, {
      name: profile.name || '',
      picture: profile.picture || '',
    });

    const res = NextResponse.redirect(new URL('/admin', baseUrl));
    res.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    res.cookies.delete('oauth_state');
    return res;
  } catch (err) {
    console.error('Google callback error:', err);
    return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent(err.message), baseUrl));
  }
}
