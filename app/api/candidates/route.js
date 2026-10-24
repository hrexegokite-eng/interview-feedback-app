import { sql } from '@/lib/db';
import { getAdmin, bad } from '@/lib/auth';


// List every candidate with all their rounds
export async function GET() {
  if (!(await getAdmin())) return bad('Unauthorized', 401);
  const rows = await sql`
    select c.id, c.name, c.role, c.status, c.created_at, c.updated_at,
      coalesce(
        json_agg(json_build_object(
          'id', r.id, 'round_no', r.round_no, 'name', r.name,
          'interviewer', r.interviewer, 'scheduled_at', r.scheduled_at,
          'token', r.token, 'decision', r.decision, 'note', r.note,
          'submitted_at', r.submitted_at,
          'meet_link', r.meet_link, 'cv_url', r.cv_url, 'cv_filename', r.cv_filename
        ) order by r.round_no) filter (where r.id is not null),
        '[]'::json
      ) as rounds
    from candidates c
    left join rounds r on r.candidate_id = c.id
    group by c.id
    order by c.updated_at desc`;
  return Response.json(rows);
}

// Add a candidate and schedule Round 1
export async function POST(req) {
  if (!(await getAdmin())) return bad('Unauthorized', 401);
  const b = await req.json().catch(() => ({}));
  const name = (b.name || '').trim();
  if (!name) return bad('Candidate name is required.');
  const rows = await sql`
    with c as (
      insert into candidates (name, role) values (${name}, ${(b.role || '').trim() || null})
      returning id
    )
    insert into rounds (candidate_id, round_no, name, interviewer, scheduled_at, meet_link, cv_url, cv_filename)
    select id, 1, ${(b.roundName || '').trim() || 'Round 1'}, ${(b.interviewer || '').trim() || null}, ${b.when || null}::timestamptz,
      ${(b.meetLink || '').trim() || null}, ${(b.cvUrl || '').trim() || null}, ${(b.cvFilename || '').trim() || null}
    from c
    returning token`;
  return Response.json({ token: rows[0].token }, { status: 201 });
}
