import { NextResponse } from 'next/server';

/**
 * Debug endpoint — shows exactly what redirect_uri the server would construct.
 * Visit: /api/auth/debug
 * REMOVE THIS FILE before going to production with sensitive info.
 */
export async function GET(req) {
  const proto = req.headers.get('x-forwarded-proto') || (req.nextUrl.protocol ? req.nextUrl.protocol.replace(':', '') : 'http');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const redirectUri = `${proto}://${host}/api/auth/google/callback`;

  return NextResponse.json({
    redirect_uri: redirectUri,
    proto,
    host,
    google_client_id_set: !!(process.env.GOOGLE_CLIENT_ID),
    google_client_id_prefix: (process.env.GOOGLE_CLIENT_ID || '').slice(0, 20) + '...',
    google_client_secret_set: !!(process.env.GOOGLE_CLIENT_SECRET),
    auth_secret_set: !!(process.env.AUTH_SECRET),
    admin_email_set: !!(process.env.ADMIN_EMAIL),
    node_env: process.env.NODE_ENV,
    headers: {
      'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
      'x-forwarded-host': req.headers.get('x-forwarded-host'),
      host: req.headers.get('host'),
    },
  });
}
