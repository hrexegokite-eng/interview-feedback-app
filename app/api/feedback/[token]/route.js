import { sql } from '@/lib/db';
import { bad } from '@/lib/auth';
import { validateEvaluation } from '@/lib/interview-feedback';

const TOKEN = /^[a-f0-9]{32}$/;

// Public: what the interviewer sees when they open their link
export async function GET(_req, { params }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return bad('Link not found.', 404);
  const rows = await sql`
    select r.round_no, r.name as round_name, r.interviewer, r.scheduled_at, r.decision, r.note, r.evaluation,
           r.meet_link, r.cv_url, r.cv_filename,
           c.name as candidate, c.role
    from rounds r join candidates c on c.id = r.candidate_id
    where r.token = ${token}`;
  if (!rows.length) return bad('Link not found.', 404);
  return Response.json(rows[0]);
}

// Public: the interviewer submits their decision
export async function POST(req, { params }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return bad('Link not found.', 404);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('Invalid feedback.');
  const { decision, note = '', evaluation } = body;
  if (!['proceed', 'reject'].includes(decision)) return bad('Choose Proceed or Reject.');
  const validEvaluation = validateEvaluation(evaluation);
  if (!validEvaluation) return bad('The interview evaluation form contains invalid values.');
  if (typeof note !== 'string' || note.length > 1500) return bad('Comments must be 1500 characters or fewer.');
  const exists = await sql`select 1 from rounds where token = ${token}`;
  if (!exists.length) return bad('Link not found.', 404);
  await sql`
    with r as (
      update rounds
      set decision = ${decision}, note = ${note.trim() || null},
          evaluation = ${JSON.stringify(validEvaluation)}::jsonb, submitted_at = now()
      where token = ${token}
      returning candidate_id, round_no
    )
    update candidates c set status = ${decision}, updated_at = now()
    from r
    where c.id = r.candidate_id
      and r.round_no = (select max(round_no) from rounds where candidate_id = r.candidate_id)`;
  return Response.json({ ok: true });
}
