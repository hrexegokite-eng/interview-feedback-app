import { bad, getModuleAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';
import { saveHropsPerson } from '@/lib/hrops';
import { readPayslip } from '@/lib/payslip';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request, { params }) {
  const { error } = await getModuleAdmin('hrops');
  if (error) return error;
  const { id } = await params;
  if (!UUID.test(id)) return bad('Payslip not found.', 404);
  const records = await sql`
    SELECT s.id, s.person_id, p.name AS employee_name, p.employee_id,
      s.company_name, s.month, s.data, s.created_at, s.updated_at
    FROM payslips s
    JOIN hrops_people p ON p.id = s.person_id
    WHERE s.id = ${id}::uuid
  `;
  if (!records.length) return bad('Payslip not found.', 404);
  return Response.json(records[0]);
}

export async function PUT(request, { params }) {
  const { admin, error } = await getModuleAdmin('hrops');
  if (error) return error;
  const { id } = await params;
  if (!UUID.test(id)) return bad('Payslip not found.', 404);
  const parsed = await readPayslip(request);
  if (parsed.error) return bad(parsed.error, parsed.status);
  if (!parsed.pdf) return bad('Generate the payslip PDF before saving it to the employee folder.', 400);

  const data = parsed.data;
  const personId = await saveHropsPerson(data, admin.email, data.personId || '');
  if (!personId) return bad('Choose an existing employee folder or enter a valid employee name.', data.personId ? 404 : 400);
  const storedData = { ...data, personId };
  const pdfHex = parsed.pdf ? parsed.pdf.toString('hex') : null;
  const records = await sql`
    UPDATE payslips
    SET person_id = ${personId}::uuid,
        company_name = ${data.company},
        month = ${data.month},
        data = ${JSON.stringify(storedData)}::jsonb,
        pdf_data = COALESCE(decode(${pdfHex}, 'hex'), pdf_data),
        updated_at = now()
    WHERE id = ${id}::uuid
    RETURNING id, person_id, company_name, month, created_at, updated_at
  `;
  if (!records.length) return bad('Payslip not found.', 404);
  return Response.json(records[0]);
}

export async function DELETE(_request, { params }) {
  const { error } = await getModuleAdmin('hrops');
  if (error) return error;
  const { id } = await params;
  if (!UUID.test(id)) return bad('Payslip not found.', 404);
  const records = await sql`
    DELETE FROM payslips
    WHERE id = ${id}::uuid
    RETURNING id
  `;
  if (!records.length) return bad('Payslip not found.', 404);
  return Response.json({ ok: true });
}
