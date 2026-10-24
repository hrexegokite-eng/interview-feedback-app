import { cookies } from 'next/headers';
import { configured, same, createSession, bad } from '@/lib/auth';


export async function POST(req) {
  if (!configured()) return bad('Server is not configured yet. Add the environment variables.', 500);
  const { email = '', password = '' } = await req.json().catch(() => ({}));
  const ok = same(email.trim().toLowerCase(), process.env.ADMIN_EMAIL.trim().toLowerCase()) &&
             same(password, process.env.ADMIN_PASSWORD);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600)); // slows down password guessing
    return bad('Incorrect email or password.', 401);
  }
  (await cookies()).set('session', await createSession(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return Response.json({ ok: true });
}
