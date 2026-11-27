import { bad, getModuleAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request, { params }) {
  const { error } = await getModuleAdmin('hrops');
  if (error) return error;
  const { id } = await params;
  if (!UUID.test(id)) return bad('Employee folder not found.', 404);

  const people = await sql`
    SELECT id, name, employee_id, profile
    FROM hrops_people
    WHERE id = ${id}::uuid
  `;
  if (!people.length) return bad('Employee folder not found.', 404);

  const [settlements, payslips] = await Promise.all([
    sql`
      SELECT id, company_name, employee_name, employee_id, data, created_at, updated_at
      FROM fnf_settlements
      WHERE person_id = ${id}::uuid
      ORDER BY updated_at DESC
    `,
    sql`
      SELECT id, company_name, month, data, created_at, updated_at, pdf_data IS NOT NULL AS has_pdf
      FROM payslips
      WHERE person_id = ${id}::uuid
      ORDER BY month DESC, updated_at DESC
    `,
  ]);
  return Response.json({ person: people[0], settlements, payslips });
}
