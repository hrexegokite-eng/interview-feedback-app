import { bad, getModuleAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';
import { readSettlement } from '@/lib/fnf';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await getModuleAdmin('hrops');
  if (error) return error;
  const records = await sql`
    SELECT id, company_name, employee_name, employee_id, created_at, updated_at
    FROM fnf_settlements
    ORDER BY updated_at DESC
  `;
  return Response.json(records);
}

export async function POST(request) {
  const { admin, error } = await getModuleAdmin('hrops');
  if (error) return error;
  const parsed = await readSettlement(request);
  if (parsed.error) return bad(parsed.error, parsed.status);

  const data = parsed.data;
  const records = await sql`
    INSERT INTO fnf_settlements (company_name, employee_name, employee_id, data, created_by)
    VALUES (
      ${data.companyName.trim()},
      ${data.employeeName.trim()},
      ${data.employeeId.trim()},
      ${JSON.stringify(data)}::jsonb,
      ${admin.email}
    )
    RETURNING id, company_name, employee_name, employee_id, created_at, updated_at
  `;
  return Response.json(records[0], { status: 201 });
}
