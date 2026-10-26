import { randomBytes } from 'crypto';
import { sql } from '@/lib/db';
import { getAdmin, bad } from '@/lib/auth';

export async function GET() {
  if (!(await getAdmin())) return bad('Unauthorized', 401);
  const rows = await sql`
    select i.id, i.token, i.title, i.description, i.employee_id,
      i.employee_name, i.employee_email, i.questions, i.answers,
      i.submitted_at, i.created_at
    from exit_interviews i
    order by i.created_at desc`;
  return Response.json(rows);
}

export async function POST(req) {
  if (!(await getAdmin())) return bad('Unauthorized', 401);
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim().slice(0, 160);
  const description = String(body.description || '').trim().slice(0, 1000);
  const employeeName = String(body.employeeName || '').trim().slice(0, 160);
  const employeeEmail = String(body.employeeEmail || '').trim().slice(0, 254).toLowerCase();
  const questions = Array.isArray(body.questions)
    ? body.questions.slice(0, 30).map((q, i) => ({
      id: String(q?.id || i).slice(0, 80),
      label: String(q?.label || '').trim().slice(0, 300),
      required: q?.required !== false,
    })).filter((q) => q.label)
    : [];

  if (!title) return bad('Form title is required.');
  if (!employeeName) return bad('Employee name is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employeeEmail)) return bad('Enter a valid employee email address.');
  if (!questions.length) return bad('Add at least one question to the form.');

  const token = randomBytes(16).toString('hex');
  const rows = await sql`
    with employee as (
      insert into exit_employees (name, email)
      values (${employeeName}, ${employeeEmail})
      on conflict (email) do update set email = excluded.email
      returning id
    )
    insert into exit_interviews (employee_id, token, title, description, employee_name, employee_email, questions)
    select id, ${token}, ${title}, ${description || null}, ${employeeName}, ${employeeEmail}, ${JSON.stringify(questions)}::jsonb
    from employee
    returning id, employee_id, token, title, description, employee_name, employee_email, questions, answers, submitted_at, created_at`;
  return Response.json(rows[0], { status: 201 });
}
