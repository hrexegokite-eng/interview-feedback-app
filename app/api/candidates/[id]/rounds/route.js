import { sql } from '@/lib/db';
import { getAdmin, bad } from '@/lib/auth';

const UUID = /^[0-9a-f-]{36}$/i;

// Schedule the next round for an existing candidate
export async function POST(req, { params }) {
  if (!(await getAdmin())) return bad('Unauthorized', 401);
  const { id } = await params;
  if (!UUID.test(id)) return bad('Invalid request.');
  const b = await req.json().catch(() => ({}));
  const pending = await sql`select 1 from rounds where candidate_id = ${id}::uuid and decision is null limit 1`;
  if (pending.length) return bad('The current round is still awaiting feedback.', 409);
  const rows = await sql`
    with n as (select coalesce(max(round_no), 0) + 1 as n from rounds where candidate_id = ${id}::uuid),
    u as (update candidates set status = 'scheduled', updated_at = now() where id = ${id}::uuid)
    insert into rounds (candidate_id, round_no, name, interviewer, scheduled_at, meet_link, cv_url, cv_filename)
    select ${id}::uuid, n.n, coalesce(${(b.roundName || '').trim() || null}::text, 'Round ' || n.n::text),
           ${(b.interviewer || '').trim() || null}, ${b.when || null}::timestamptz,
           ${(b.meetLink || '').trim() || null}, ${(b.cvUrl || '').trim() || null}, ${(b.cvFilename || '').trim() || null}
    from n
    returning token, round_no`;
  return Response.json(rows[0], { status: 201 });
}
