import { bad, getModuleAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request, { params }) {
  const { error } = await getModuleAdmin('hrops');
  if (error) return error;
  const { id } = await params;
  if (!UUID.test(id)) return bad('Payslip not found.', 404);

  const records = await sql`
    SELECT s.pdf_data, s.month, p.name AS employee_name
    FROM payslips s
    JOIN hrops_people p ON p.id = s.person_id
    WHERE s.id = ${id}::uuid
  `;
  if (!records.length) return bad('Payslip not found.', 404);
  if (!records[0].pdf_data) return bad('No saved PDF is available for this payslip.', 404);

  const file = Buffer.from(records[0].pdf_data);
  const filename = `${records[0].employee_name}-${records[0].month}-payslip.pdf`
    .replace(/[^a-zA-Z0-9._-]+/g, '-');
  return new Response(file, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(file.length),
      'Cache-Control': 'private, no-store',
    },
  });
}
