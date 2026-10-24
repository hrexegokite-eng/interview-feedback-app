import { NextResponse } from 'next/server';

function getRedirectUri(req) {
  const proto = req.headers.get('x-forwarded-proto') || (req.nextUrl.protocol ? req.nextUrl.protocol.replace(':', '') : 'http');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  return `${proto}://${host}/api/auth/google/callback`;
}

export async function GET(req) {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const redirectUri = getRedirectUri(req);

  if (!clientId) {
    return NextResponse.json({
      configured: false,
      message: 'GOOGLE_CLIENT_ID is not configured in .env.local',
    }, { status: 400 });
  }

  const state = Math.random().toString(36).substring(2);
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('prompt', 'select_account');
  googleAuthUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(googleAuthUrl.toString());
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });
  return res;
}
