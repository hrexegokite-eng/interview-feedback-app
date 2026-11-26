import { sql } from '@/lib/db';
import { getModuleAdmin, bad, logAdminAction } from '@/lib/auth';

const UUID = /^[0-9a-f-]{36}$/i;

// List every candidate with all their rounds
export async function GET() {
  const { error } = await getModuleAdmin('interview-feedback');
  if (error) return error;
  const rows = await sql`
    select c.id, c.name, coalesce(f.name, c.bcu) as bcu, c.feedback_form_id, c.role, c.status, c.created_at, c.updated_at,
      coalesce(
        json_agg(json_build_object(
          'id', r.id, 'round_no', r.round_no, 'name', r.name,
          'interviewer', r.interviewer, 'scheduled_at', r.scheduled_at,
          'token', r.token, 'decision', r.decision, 'note', r.note,
          'submitted_at', r.submitted_at,
          'meet_link', r.meet_link, 'cv_url', r.cv_url, 'cv_filename', r.cv_filename,
          'evaluation', r.evaluation, 'form_snapshot', r.form_snapshot
        ) order by r.round_no) filter (where r.id is not null),
        '[]'::json
      ) as rounds
    from candidates c
    left join feedback_forms f on f.id = c.feedback_form_id
    left join rounds r on r.candidate_id = c.id
    group by c.id, f.name
    order by c.updated_at desc`;
  return Response.json(rows);
}

// Add a candidate and schedule Round 1
export async function POST(req) {
  const { admin, error } = await getModuleAdmin('interview-feedback');
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const interviewer = typeof b.interviewer === 'string' ? b.interviewer.trim() : '';
  if (!name) return bad('Candidate name is required.');
  if (!interviewer) return bad('Interviewer name is required.');
  const feedbackFormId = typeof b.feedbackFormId === 'string' ? b.feedbackFormId.trim() : '';
  if (feedbackFormId && !UUID.test(feedbackFormId)) return bad('Choose a valid feedback form.');
  const formRows = feedbackFormId
    ? await sql`select id, name, questions, version from feedback_forms where id = ${feedbackFormId}::uuid and active = true`
    : [];
  if (feedbackFormId && !formRows.length) return bad('That feedback form is unavailable.', 404);
  const form = formRows[0];
  const legacyBcu = typeof b.bcu === 'string' ? b.bcu.trim() : '';
  if (legacyBcu.length > 120) return bad('SBU must be 120 characters or fewer.');
  const snapshot = form ? { id: form.id, name: form.name, version: form.version, questions: form.questions } : null;
  const rows = await sql`
    with c as (
      insert into candidates (name, bcu, feedback_form_id, role)
      values (${name}, ${form?.name || legacyBcu || null}, ${form?.id || null}::uuid, ${(typeof b.role === 'string' ? b.role.trim() : '') || null})
      returning id
    )
    insert into rounds (candidate_id, round_no, name, interviewer, scheduled_at, meet_link, cv_url, cv_filename, form_snapshot)
    select id, 1, ${(typeof b.roundName === 'string' ? b.roundName.trim() : '') || 'Round 1'}, ${interviewer || null}, ${b.when || null}::timestamptz,
      ${(typeof b.meetLink === 'string' ? b.meetLink.trim() : '') || null}, ${(typeof b.cvUrl === 'string' ? b.cvUrl.trim() : '') || null},
      ${(typeof b.cvFilename === 'string' ? b.cvFilename.trim() : '') || null}, ${snapshot ? JSON.stringify(snapshot) : null}::jsonb
    from c
    returning candidate_id as id, token`;
  await logAdminAction(admin.email, 'candidate.created', rows[0].id);
  return Response.json({ token: rows[0].token }, { status: 201 });
}
