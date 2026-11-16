import { sql } from '@/lib/db';
import { bad, getAdmin, logAdminAction } from '@/lib/auth';
import { normalizeFeedbackQuestions } from '@/lib/interview-feedback';

const UUID = /^[0-9a-f-]{36}$/i;

async function authorize() {
  const admin = await getAdmin();
  if (!admin) return { error: bad('Unauthorized', 401) };
  if (admin.role !== 'superadmin') return { error: bad('Super admin access required.', 403) };
  return { admin };
}

export async function GET() {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const forms = await sql`
    select id, name, questions, version, active, created_at, updated_at
    from feedback_forms
    order by lower(name)
  `;
  return Response.json(forms);
}

export async function POST(req) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const questions = normalizeFeedbackQuestions(body?.questions);
  if (!name || name.length > 120 || !questions) return bad('Enter a form name and add valid questions.');

  const duplicate = await sql`select 1 from feedback_forms where lower(name) = lower(${name})`;
  if (duplicate.length) return bad('A form with that name already exists.', 409);

  try {
    const rows = await sql`
      insert into feedback_forms (name, questions)
      values (${name}, ${JSON.stringify(questions)}::jsonb)
      returning id, name, questions, version, active, created_at, updated_at
    `;
    await logAdminAction(auth.admin.email, 'feedback_form.created', rows[0].id, { name });
    return Response.json(rows[0], { status: 201 });
  } catch (error) {
    if (error.code === '23505') return bad('A form with that name already exists.', 409);
    throw error;
  }
}

export async function PATCH(req) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!UUID.test(id)) return bad('Choose a valid form.');

  if (typeof body.active === 'boolean' && body.name === undefined && body.questions === undefined) {
    const rows = await sql`
      update feedback_forms set active = ${body.active}, updated_at = now()
      where id = ${id}::uuid
      returning id, name, questions, version, active, created_at, updated_at
    `;
    if (!rows.length) return bad('Form not found.', 404);
    await logAdminAction(auth.admin.email, body.active ? 'feedback_form.restored' : 'feedback_form.archived', id, { name: rows[0].name });
    return Response.json(rows[0]);
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const questions = normalizeFeedbackQuestions(body.questions);
  if (!name || name.length > 120 || !questions) return bad('Enter a form name and add valid questions.');
  const duplicate = await sql`select 1 from feedback_forms where lower(name) = lower(${name}) and id <> ${id}::uuid`;
  if (duplicate.length) return bad('A form with that name already exists.', 409);

  try {
    const rows = await sql`
      update feedback_forms
      set name = ${name}, questions = ${JSON.stringify(questions)}::jsonb,
          version = version + 1, updated_at = now()
      where id = ${id}::uuid
      returning id, name, questions, version, active, created_at, updated_at
    `;
    if (!rows.length) return bad('Form not found.', 404);
    await logAdminAction(auth.admin.email, 'feedback_form.updated', id, { name, version: rows[0].version });
    return Response.json(rows[0]);
  } catch (error) {
    if (error.code === '23505') return bad('A form with that name already exists.', 409);
    throw error;
  }
}
