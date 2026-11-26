import { bad, getModuleAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';
import { readSettlement } from '@/lib/fnf';
import { saveHropsPerson } from '@/lib/hrops';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request, { params }) {
  const { error } = await getModuleAdmin('hrops');
  if (error) return error;
  const { id } = await params;
  if (!UUID.test(id)) return bad('Settlement not found.', 404);
  const records = await sql`
    SELECT id, person_id, company_name, employee_name, employee_id, data, created_at, updated_at
    FROM fnf_settlements
    WHERE id = ${id}::uuid
  `;
  if (!records.length) return bad('Settlement not found.', 404);
  return Response.json(records[0]);
}

export async function PUT(request, { params }) {
  const { admin, error } = await getModuleAdmin('hrops');
  if (error) return error;
  const { id } = await params;
  if (!UUID.test(id)) return bad('Settlement not found.', 404);
  const parsed = await readSettlement(request);
  if (parsed.error) return bad(parsed.error, parsed.status);

  const data = parsed.data;
  const personId = await saveHropsPerson(data, admin.email, data.personId || '');
  if (!personId) return bad('Could not create or find the employee folder.', data.personId ? 404 : 400);
  const records = await sql`
    UPDATE fnf_settlements
    SET person_id = ${personId}::uuid,
        company_name = ${data.companyName.trim()},
        employee_name = ${data.employeeName.trim()},
        employee_id = ${data.employeeId.trim()},
        data = ${JSON.stringify(data)}::jsonb,
        updated_at = now()
    WHERE id = ${id}::uuid
    RETURNING id, person_id, company_name, employee_name, employee_id, created_at, updated_at
  `;
  if (!records.length) return bad('Settlement not found.', 404);
  return Response.json(records[0]);
}

export async function DELETE(_request, { params }) {
  const { error } = await getModuleAdmin('hrops');
  if (error) return error;
  const { id } = await params;
  if (!UUID.test(id)) return bad('Settlement not found.', 404);
  const records = await sql`
    DELETE FROM fnf_settlements
    WHERE id = ${id}::uuid
    RETURNING id
  `;
  if (!records.length) return bad('Settlement not found.', 404);
  return Response.json({ ok: true });
}
