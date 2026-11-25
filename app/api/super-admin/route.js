import { sql } from '@/lib/db';
import { bad, getAdmin, logAdminAction } from '@/lib/auth';

const MODULES = ['interview-feedback', 'exit-form'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function authorize() {
  const admin = await getAdmin();
  if (!admin) return { error: bad('Unauthorized', 401) };
  if (admin.role !== 'superadmin') return { error: bad('Super admin access required.', 403) };
  return { admin };
}

export async function GET() {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const [admins, modules, audit, counts, storage] = await Promise.all([
    sql`select email, role, created_at, created_by from admin_users order by role desc, email`,
    sql`select key, enabled, updated_at, updated_by from workspace_modules order by key`,
    sql`select id, actor_email, action, target, details, created_at from admin_audit_log order by created_at desc limit 100`,
    sql`select count(*)::int as candidates, count(*) filter (where status = 'complete')::int as onboarding from candidates`,
    sql`select pg_database_size(current_database())::text as used_bytes`,
  ]);

  const usedBytes = Number(storage[0]?.used_bytes);
  if (!Number.isSafeInteger(usedBytes) || usedBytes < 0) {
    throw new Error('Database returned an invalid storage size.');
  }

  const configuredLimit = process.env.DATABASE_STORAGE_LIMIT_GB?.trim() || '';
  let limitBytes = null;
  let storageConfigError = null;
  if (configuredLimit) {
    const limitGb = Number(configuredLimit);
    const parsedLimitBytes = Math.round(limitGb * 1_000_000_000);
    if (!/^\d+(?:\.\d+)?$/.test(configuredLimit) || !Number.isSafeInteger(parsedLimitBytes) || parsedLimitBytes <= 0) {
      storageConfigError = 'DATABASE_STORAGE_LIMIT_GB must be a positive number.';
    } else {
      limitBytes = parsedLimitBytes;
    }
  }

  return Response.json({
    admins,
    modules,
    audit,
    counts: counts[0],
    storage: { usedBytes, limitBytes, configError: storageConfigError },
  });
}

export async function POST(req) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL.test(email) || email.length > 254) return bad('Enter a valid email address.');

  const rows = await sql`
    insert into admin_users (email, role, created_by)
    values (${email}, 'admin', ${auth.admin.email})
    on conflict (email) do nothing
    returning email, role, created_at, created_by
  `;
  if (!rows.length) return bad('That email already has admin access.', 409);
  await logAdminAction(auth.admin.email, 'admin.added', email);
  return Response.json(rows[0], { status: 201 });
}

export async function PATCH(req) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => null);
  const key = typeof body?.key === 'string' ? body.key : '';
  const enabled = body?.enabled;
  if (!MODULES.includes(key) || typeof enabled !== 'boolean') return bad('Choose a valid workspace module and enabled state.');

  const rows = await sql`
    update workspace_modules
    set enabled = ${enabled}, updated_at = now(), updated_by = ${auth.admin.email}
    where key = ${key}
    returning key, enabled, updated_at, updated_by
  `;
  if (!rows.length) return bad('Workspace module not found.', 404);
  await logAdminAction(auth.admin.email, 'module.updated', key, { enabled });
  return Response.json(rows[0]);
}

export async function DELETE(req) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL.test(email)) return bad('Choose a valid admin email address.');
  if (email === auth.admin.email) return bad('You cannot remove your own admin access.');

  const rows = await sql`
    delete from admin_users
    where email = ${email} and role = 'admin'
    returning email
  `;
  if (!rows.length) return bad('Admin not found or cannot be removed.', 404);
  await logAdminAction(auth.admin.email, 'admin.removed', email);
  return Response.json({ ok: true });
}
