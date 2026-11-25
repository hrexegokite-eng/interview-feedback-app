import { cookies } from 'next/headers';
import { createSession, isAdminEmail, sessionCookieOptions } from '@/lib/auth';

export async function POST(req) {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'Development sign-in is disabled in production.' }, { status: 404 });
  }
  const { email = process.env.SUPER_ADMIN_EMAIL || 'hrops@gokitetours.com', name = 'Go Kite Admin' } = await req.json().catch(() => ({}));
  const trimmed = String(email || '').trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) {
    return Response.json({ error: 'Valid Google email is required.' }, { status: 400 });
  }
  if (!(await isAdminEmail(trimmed))) {
    return Response.json({ error: 'This account has not been granted admin access.' }, { status: 403 });
  }

  const sessionToken = await createSession(trimmed, {
    name: name || trimmed.split('@')[0],
  });

  (await cookies()).set('session', sessionToken, sessionCookieOptions());

  return Response.json({ ok: true, email: trimmed });
}
