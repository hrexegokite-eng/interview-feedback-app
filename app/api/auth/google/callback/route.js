import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSession } from '@/lib/auth';

export async function GET(req) {
  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=Google+sign+in+cancelled', url.origin));
  }

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=Google+OAuth+not+configured', url.origin));
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
      return NextResponse.redirect(new URL('/login?error=Failed+to+verify+Google+account', url.origin));
    }

    // 2. Fetch Google profile
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userRes.json();

    if (!userRes.ok || !profile.email) {
      return NextResponse.redirect(new URL('/login?error=Unable+to+retrieve+Google+profile', url.origin));
    }

    // 3. Create session JWT
    const sessionToken = await createSession(profile.email, {
      name: profile.name || '',
      picture: profile.picture || '',
    });

    const res = NextResponse.redirect(new URL('/admin', url.origin));
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
    return NextResponse.redirect(new URL('/login?error=' + encodeURIComponent(err.message), url.origin));
  }
}
