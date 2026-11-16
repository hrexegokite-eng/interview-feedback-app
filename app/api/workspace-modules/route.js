import { sql } from '@/lib/db';
import { getAdmin, bad } from '@/lib/auth';

export async function GET() {
  if (!(await getAdmin())) return bad('Unauthorized', 401);
  const modules = await sql`select key, enabled from workspace_modules order by key`;
  return Response.json(modules);
}
