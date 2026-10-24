import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || '');

export const configured = () => !!process.env.AUTH_SECRET;


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
