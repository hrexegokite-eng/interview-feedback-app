import { bad, getModuleAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';
import { saveHropsPerson } from '@/lib/hrops';
import { readPayslip } from '@/lib/payslip';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await getModuleAdmin('hrops');
  if (error) return error;
  const records = await sql`
    SELECT s.id, s.person_id, p.name AS employee_name, p.employee_id,
      s.company_name, s.month, s.created_at, s.updated_at
    FROM payslips s
    JOIN hrops_people p ON p.id = s.person_id
    ORDER BY s.updated_at DESC
  `;
  return Response.json(records);
}

export async function POST(request) {
  const { admin, error } = await getModuleAdmin('hrops');
  if (error) return error;
  const parsed = await readPayslip(request);
  if (parsed.error) return bad(parsed.error, parsed.status);

  const data = parsed.data;
  const personId = await saveHropsPerson(data, admin.email, data.personId || '');
  if (!personId) return bad('Choose an existing employee folder or enter a valid employee name.', data.personId ? 404 : 400);
  const storedData = { ...data, personId };
  const records = await sql`
    INSERT INTO payslips (person_id, company_name, month, data, created_by)
    VALUES (${personId}::uuid, ${data.company}, ${data.month}, ${JSON.stringify(storedData)}::jsonb, ${admin.email})
    RETURNING id, person_id, company_name, month, created_at, updated_at
  `;
  return Response.json(records[0], { status: 201 });
}
