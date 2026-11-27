import { bad, getModuleAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(_request, { params }) {
  const { error } = await getModuleAdmin('hrops');
  if (error) return error;
  const { id } = await params;
  if (!UUID.test(id)) return bad('Employee folder not found.', 404);

  const records = await sql`
    DELETE FROM hrops_people
    WHERE id = ${id}::uuid
    RETURNING id
  `;
  if (!records.length) return bad('Employee folder not found.', 404);
  return Response.json({ ok: true });
}
