import { randomBytes } from 'crypto';
import { getModuleAdmin, bad } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const { error } = await getModuleAdmin('exit-form');
  if (error) return error;
  const rows = await sql`
    select token, responses, created_at, submitted_at
    from exit_forms
    order by created_at desc`;
  return Response.json(rows);
}

export async function POST() {
  const { error } = await getModuleAdmin('exit-form');
  if (error) return error;
  const token = randomBytes(32).toString('hex');
  await sql`insert into exit_forms (token) values (${token})`;
  return Response.json({ token }, { status: 201 });
}
