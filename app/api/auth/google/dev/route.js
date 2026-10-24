import { cookies } from 'next/headers';
import { createSession } from '@/lib/auth';

export async function POST(req) {
  const { email = 'admin@gokite.com', name = 'Go Kite Admin' } = await req.json().catch(() => ({}));
  const trimmed = String(email || '').trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) {
    return Response.json({ error: 'Valid Google email is required.' }, { status: 400 });
  }

  const sessionToken = await createSession(trimmed, {
    name: name || trimmed.split('@')[0],
  });

  (await cookies()).set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return Response.json({ ok: true, email: trimmed });
}
