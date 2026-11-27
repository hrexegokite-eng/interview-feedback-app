import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { sql } from '@/lib/db';
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || '');

export const configured = () => !!process.env.AUTH_SECRET;


export async function createSession(email, extra = {}) {
  return new SignJWT({ email, ...extra })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(key());
}

async function getSessionPayload() {
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

export async function getAdmin() {
  const payload = await getSessionPayload();
  if (!payload) return null;
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

export async function getModuleAdmin(moduleKey) {
  const payload = await getSessionPayload();
  if (!payload) return { admin: null, error: bad('Unauthorized', 401) };
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email) return { admin: null, error: bad('Unauthorized', 401) };
  const rows = await sql`
    select u.role, m.enabled, coalesce(a.enabled, false) as assigned
    from admin_users u
    left join workspace_modules m on m.key = ${moduleKey}
    left join admin_module_access a
      on a.module_key = m.key and a.admin_email = u.email
    where u.email = ${email}
  `;
  if (!rows.length) return { admin: null, error: bad('Unauthorized', 401) };
  const access = rows[0];
  if (!access.enabled || (access.role !== 'superadmin' && !access.assigned)) {
    return { admin: null, error: bad('You do not have access to this module.', 403) };
  }
  return { admin: { ...payload, email, role: access.role }, error: null };
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
