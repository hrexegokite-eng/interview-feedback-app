import { sql } from '@/lib/db';
import { bad, getAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await getAdmin())) return bad('Unauthorized', 401);
  const forms = await sql`
    select id, name, active
    from feedback_forms
    order by lower(name)
  `;
  return Response.json(forms);
}
