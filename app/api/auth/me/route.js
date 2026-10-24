import { getAdmin, bad } from '@/lib/auth';


export async function GET() {
  const a = await getAdmin();
  return a ? Response.json({ email: a.email, name: a.name, picture: a.picture }) : bad('Unauthorized', 401);
}
