import { sql } from '@/lib/db';
import { getAdmin, bad } from '@/lib/auth';

export async function GET() {
  if (!(await getAdmin())) return bad('Unauthorized', 401);
  const rows = await sql`
    select e.id, e.name, e.email, e.created_at,
      count(i.id)::int as interview_count,
      max(i.created_at) as latest_interview_at
    from exit_employees e
    left join exit_interviews i on i.employee_id = e.id
    group by e.id
    order by e.name`;
  return Response.json(rows);
}
