import { sql } from '@/lib/db';
import { getAdmin, bad } from '@/lib/auth';

const UUID = /^[0-9a-f-]{36}$/i;

// Change a candidate's status by hand
export async function PATCH(req, { params }) {
  if (!(await getAdmin())) return bad('Unauthorized', 401);
  const { id } = await params;
  const { status } = await req.json().catch(() => ({}));
  if (!UUID.test(id) || !['proceed', 'hold', 'reject'].includes(status)) return bad('Invalid request.');
  await sql`update candidates set status = ${status}, updated_at = now() where id = ${id}::uuid`;
  return Response.json({ ok: true });
}

// Delete a candidate (their rounds are deleted automatically)
export async function DELETE(_req, { params }) {
  if (!(await getAdmin())) return bad('Unauthorized', 401);
  const { id } = await params;
  if (!UUID.test(id)) return bad('Invalid request.');
  await sql`delete from candidates where id = ${id}::uuid`;
  return Response.json({ ok: true });
}
