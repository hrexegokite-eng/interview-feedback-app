import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { sql } from '@/lib/db';
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || '');

export const configured = () => !!process.env.AUTH_SECRET;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };
}

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
  let payload;
  try {
    ({ payload } = await jwtVerify(token, key()));
  } catch {
    return null;
  }
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email) return null;
  const rows = await sql`select role from admin_users where email = ${email}`;
  if (!rows.length) return null;
  return { ...payload, email, role: rows[0].role };
}

export async function getSuperAdmin() {
  const admin = await getAdmin();
  return admin?.role === 'superadmin' ? admin : null;
}

export async function isAdminEmail(email) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedEmail) return false;
  const rows = await sql`select 1 from admin_users where email = ${normalizedEmail}`;
  return rows.length > 0;
}

export async function logAdminAction(actorEmail, action, target = null, details = {}) {
  await sql`
    insert into admin_audit_log (actor_email, action, target, details)
    values (${actorEmail}, ${action}, ${target}, ${JSON.stringify(details)}::jsonb)
  `;
}

export const bad = (message, status = 400) => Response.json({ error: message }, { status });
