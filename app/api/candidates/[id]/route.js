import { sql } from '@/lib/db';
import { getAdmin, bad } from '@/lib/auth';

const UUID = /^[0-9a-f-]{36}$/i;

// Change a candidate's status by hand
export async function PATCH(req, { params }) {
  if (!(await getAdmin())) return bad('Unauthorized', 401);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('Invalid request.');
  if (!UUID.test(id)) return bad('Invalid request.');

  if (Object.hasOwn(body, 'status')) {
    if (!['proceed', 'hold', 'reject'].includes(body.status)) return bad('Invalid request.');
    await sql`update candidates set status = ${body.status}, updated_at = now() where id = ${id}::uuid`;
    return Response.json({ ok: true });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const bcu = typeof body.bcu === 'string' ? body.bcu.trim() : '';
  const role = typeof body.role === 'string' ? body.role.trim() : '';
  if (!name || name.length > 200 || bcu.length > 120 || role.length > 200) return bad('Enter a candidate name and keep each field within its length limit.');

  const rows = await sql`
    update candidates
    set name = ${name}, bcu = ${bcu || null}, role = ${role || null}, updated_at = now()
    where id = ${id}::uuid
    returning id`;
  if (!rows.length) return bad('Candidate not found.', 404);
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
