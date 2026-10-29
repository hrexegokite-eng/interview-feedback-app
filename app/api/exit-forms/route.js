import { randomBytes } from 'crypto';
import { getAdmin, bad } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  if (!(await getAdmin())) return bad('Unauthorized', 401);
  const rows = await sql`
    select token, responses, created_at, submitted_at
    from exit_forms
    order by created_at desc`;
  return Response.json(rows);
}

export async function POST() {
  if (!(await getAdmin())) return bad('Unauthorized', 401);
  const token = randomBytes(32).toString('hex');
  await sql`insert into exit_forms (token) values (${token})`;
  return Response.json({ token }, { status: 201 });
}
