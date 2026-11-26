import { sql } from '@/lib/db';
import { getAdmin, bad } from '@/lib/auth';

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return bad('Unauthorized', 401);
  const modules = await sql`
    select m.key,
      (m.enabled and (${admin.role === 'superadmin'} or coalesce(a.enabled, false))) as enabled
    from workspace_modules m
    left join admin_module_access a
      on a.module_key = m.key and a.admin_email = ${admin.email}
    order by m.key
  `;
  return Response.json(modules);
}
