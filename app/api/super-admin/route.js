import { sql } from '@/lib/db';
import { bad, getAdmin, logAdminAction } from '@/lib/auth';

const MODULES = ['interview-feedback', 'exit-form', 'hrops'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEON_API_BASE = 'https://console.neon.tech/api/v2';
const FREE_PLAN_PROJECT_STORAGE_BYTES = 1_000_000_000;

async function getNeonStorageCapacity() {
  const apiKey = process.env.NEON_API_KEY?.trim();
  const projectId = process.env.NEON_PROJECT_ID?.trim();
  if (!apiKey || !projectId) {
    return {
      planName: null,
      capacityType: 'unavailable',
      limitBytes: null,
      capacityError: 'Set NEON_API_KEY and NEON_PROJECT_ID in the server environment to read plan capacity from Neon.',
    };
  }
  if (!/^[a-z0-9-]{1,60}$/i.test(projectId)) {
    return {
      planName: null,
      capacityType: 'unavailable',
      limitBytes: null,
      capacityError: 'NEON_PROJECT_ID is not a valid Neon project ID.',
    };
  }

  let response;
  try {
    response = await fetch(`${NEON_API_BASE}/projects/${encodeURIComponent(projectId)}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      cache: 'no-store',
    });
  } catch (error) {
    console.error('Neon project lookup failed:', error);
    return {
      planName: null,
      capacityType: 'unavailable',
      limitBytes: null,
      capacityError: 'Could not connect to the Neon API to read plan capacity.',
    };
  }
  if (!response.ok) {
    console.error(`Neon project lookup returned HTTP ${response.status}.`);
    return {
      planName: null,
      capacityType: 'unavailable',
      limitBytes: null,
      capacityError: `Neon API returned HTTP ${response.status}. Check the API key and project ID.`,
    };
  }

  let project;
  try {
    ({ project } = await response.json());
  } catch (error) {
    console.error('Neon project response could not be parsed:', error);
    return {
      planName: null,
      capacityType: 'unavailable',
      limitBytes: null,
      capacityError: 'Neon returned an invalid project response.',
    };
  }

  const subscriptionType = project?.owner?.subscription_type;
  if (typeof subscriptionType !== 'string' || !subscriptionType) {
    console.error('Neon project response is missing its subscription type.');
    return {
      planName: null,
      capacityType: 'unavailable',
      limitBytes: null,
      capacityError: 'Neon did not return a plan for this project.',
    };
  }

  const planKey = subscriptionType.toLowerCase().split('_')[0];
  const planName = planKey.charAt(0).toUpperCase() + planKey.slice(1);
  if (planKey === 'free') {
    return {
      planName,
      capacityType: 'fixed',
      limitBytes: FREE_PLAN_PROJECT_STORAGE_BYTES,
      capacityError: null,
    };
  }
  if (['launch', 'scale', 'agent', 'business', 'enterprise'].includes(planKey)) {
    return { planName, capacityType: 'usage-based', limitBytes: null, capacityError: null };
  }

  console.error(`Neon returned an unsupported subscription type: ${subscriptionType}.`);
  return {
    planName,
    capacityType: 'unavailable',
    limitBytes: null,
    capacityError: 'The Neon plan type is not recognized by the storage display.',
  };
}

async function authorize() {
  const admin = await getAdmin();
  if (!admin) return { error: bad('Unauthorized', 401) };
  if (admin.role !== 'superadmin') return { error: bad('Super admin access required.', 403) };
  return { admin };
}

export async function GET() {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const [admins, modules, moduleAccess, audit, counts, storage, capacity] = await Promise.all([
    sql`select email, role, created_at, created_by from admin_users order by role desc, email`,
    sql`select key, enabled, updated_at, updated_by from workspace_modules order by key`,
    sql`select admin_email, module_key from admin_module_access where enabled = true`,
    sql`select id, actor_email, action, target, details, created_at from admin_audit_log order by created_at desc limit 100`,
    sql`select count(*)::int as candidates, count(*) filter (where status = 'complete')::int as onboarding from candidates`,
    sql`select pg_database_size(current_database())::text as used_bytes`,
    getNeonStorageCapacity(),
  ]);

  const usedBytes = Number(storage[0]?.used_bytes);
  if (!Number.isSafeInteger(usedBytes) || usedBytes < 0) {
    throw new Error('Database returned an invalid storage size.');
  }

  return Response.json({
    admins: admins.map((admin) => ({
      ...admin,
      modules: admin.role === 'superadmin'
        ? modules.filter((module) => module.enabled).map((module) => module.key)
        : moduleAccess.filter((access) => access.admin_email === admin.email).map((access) => access.module_key),
    })),
    modules,
    audit,
    counts: counts[0],
    storage: { usedBytes, ...capacity },
  });
}

export async function POST(req) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL.test(email) || email.length > 254) return bad('Enter a valid email address.');

  const rows = await sql`
    with new_admin as (
      insert into admin_users (email, role, created_by)
      values (${email}, 'admin', ${auth.admin.email})
      on conflict (email) do nothing
      returning email, role, created_at, created_by
    ), access as (
      insert into admin_module_access (admin_email, module_key, enabled)
      select new_admin.email, module.key, module.enabled
      from new_admin cross join workspace_modules module
      on conflict (admin_email, module_key) do nothing
      returning admin_email
    )
    select email, role, created_at, created_by from new_admin
  `;
  if (!rows.length) return bad('That email already has admin access.', 409);
  await logAdminAction(auth.admin.email, 'admin.added', email);
  return Response.json(rows[0], { status: 201 });
}

export async function PATCH(req) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => null);
  if (Array.isArray(body?.modules)) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const modules = body.modules;
    if (!EMAIL.test(email) || email.length > 254) return bad('Choose a valid admin email address.');
    if (modules.some((key) => typeof key !== 'string' || !MODULES.includes(key))
      || new Set(modules).size !== modules.length) {
      return bad('Choose valid workspace modules.');
    }
    const target = await sql`select role from admin_users where email = ${email}`;
    if (!target.length || target[0].role !== 'admin') return bad('Admin not found or cannot be changed.', 404);

    await sql`
      update admin_module_access
      set enabled = module_key = any(${modules}::text[])
      where admin_email = ${email}
    `;
    await logAdminAction(auth.admin.email, 'admin.modules_updated', email, { modules });
    return Response.json({ email, modules });
  }

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
