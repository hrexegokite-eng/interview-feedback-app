import { sql } from '@/lib/db';
import { bad, getModuleAdmin } from '@/lib/auth';

export async function GET() {
  const { error } = await getModuleAdmin('interview-feedback');
  if (error) return error;
  const forms = await sql`
    select id, name, active
    from feedback_forms
    order by lower(name)
  `;
  return Response.json(forms);
}
