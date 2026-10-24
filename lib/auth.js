import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createHash, timingSafeEqual } from 'crypto';

const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || '');

export const configured = () =>
  !!(process.env.AUTH_SECRET && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);

const h = (s) => createHash('sha256').update(String(s)).digest();
export const same = (a, b) => timingSafeEqual(h(a), h(b));

export async function createSession(email, extra = {}) {
  return new SignJWT({ email, ...extra })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(key());
}

export async function getAdmin() {
  if (!process.env.AUTH_SECRET) return null;
  const token = (await cookies()).get('session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload;
  } catch {
    return null;
  }
}

export const bad = (message, status = 400) => Response.json({ error: message }, { status });
