import { NextResponse } from 'next/server';

export async function GET(req) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;

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
