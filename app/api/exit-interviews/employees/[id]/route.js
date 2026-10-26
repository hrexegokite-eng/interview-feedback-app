import { sql } from '@/lib/db';
import { getAdmin, bad } from '@/lib/auth';

const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(_req, { params }) {
  if (!(await getAdmin())) return bad('Unauthorized', 401);
  const { id } = await params;
  if (!UUID.test(id)) return bad('Employee profile not found.', 404);
  const rows = await sql`
    select e.id, e.name, e.email, e.created_at,
      coalesce(
        json_agg(json_build_object(
          'id', i.id, 'token', i.token, 'title', i.title, 'description', i.description,
          'questions', i.questions, 'answers', i.answers, 'submitted_at', i.submitted_at,
          'created_at', i.created_at
        ) order by i.created_at desc) filter (where i.id is not null),
        '[]'::json
      ) as interviews
    from exit_employees e
    left join exit_interviews i on i.employee_id = e.id
    where e.id = ${id}::uuid
    group by e.id`;
  if (!rows.length) return bad('Employee profile not found.', 404);
  return Response.json(rows[0]);
}
