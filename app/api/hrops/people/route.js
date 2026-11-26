import { bad, getModuleAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await getModuleAdmin('hrops');
  if (error) return error;
  const people = await sql`
    SELECT id, name, employee_id, profile, updated_at
    FROM hrops_people
    ORDER BY lower(name), employee_id
  `;
  return Response.json(people);
}
