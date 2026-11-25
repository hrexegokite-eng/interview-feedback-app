import { sql } from '@/lib/db';
import { getAdmin, bad, logAdminAction } from '@/lib/auth';

const UUID = /^[0-9a-f-]{36}$/i;

// Change a candidate's status by hand
export async function PATCH(req, { params }) {
  const admin = await getAdmin();
  if (!admin) return bad('Unauthorized', 401);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('Invalid request.');
  if (!UUID.test(id)) return bad('Invalid request.');

  if (Object.hasOwn(body, 'status')) {
    if (!['proceed', 'hold', 'reject', 'complete'].includes(body.status)) return bad('Invalid request.');
    if (body.status === 'complete') {
      const rows = await sql`
        update candidates c
        set status = 'complete', updated_at = now()
        where c.id = ${id}::uuid and c.status = 'proceed'
          and exists (select 1 from rounds r where r.candidate_id = c.id)
          and not exists (select 1 from rounds r where r.candidate_id = c.id and r.decision is null)
        returning c.id
      `;
      if (!rows.length) {
        const eligibility = await sql`
          select c.status, count(r.id)::int as round_count,
            count(r.id) filter (where r.decision is null)::int as pending_rounds
          from candidates c
          left join rounds r on r.candidate_id = c.id
          where c.id = ${id}::uuid
          group by c.id
        `;
        if (!eligibility.length) return bad('Candidate not found.', 404);
        if (eligibility[0].status !== 'proceed') return bad('Shortlist the candidate before marking them as onboarded.', 409);
        if (!eligibility[0].round_count) return bad('Schedule at least one interview round before onboarding.', 409);
        if (eligibility[0].pending_rounds) return bad('Complete all interview rounds before marking the candidate as onboarded.', 409);
        return bad('Candidate status changed. Refresh and try again.', 409);
      }
      await logAdminAction(admin.email, 'candidate.status_changed', id, { status: body.status });
      return Response.json({ ok: true });
    }
    const rows = await sql`
      update candidates set status = ${body.status}, updated_at = now()
      where id = ${id}::uuid returning id`;
    if (!rows.length) return bad('Candidate not found.', 404);
    await logAdminAction(admin.email, 'candidate.status_changed', id, { status: body.status });
    return Response.json({ ok: true });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const role = typeof body.role === 'string' ? body.role.trim() : '';
  const legacyBcu = typeof body.legacyBcu === 'string'
    ? body.legacyBcu.trim()
    : typeof body.bcu === 'string' ? body.bcu.trim() : '';
  if (!name || name.length > 200 || legacyBcu.length > 120 || role.length > 200) return bad('Enter a candidate name and keep each field within its length limit.');

  const current = await sql`select feedback_form_id, bcu from candidates where id = ${id}::uuid`;
  if (!current.length) return bad('Candidate not found.', 404);
  let feedbackFormId = null;
  let bcu = legacyBcu || current[0].bcu || null;

  if (Object.hasOwn(body, 'feedbackFormId')) {
    const requestedFormId = typeof body.feedbackFormId === 'string' ? body.feedbackFormId.trim() : '';
    if (requestedFormId && !UUID.test(requestedFormId)) return bad('Choose a valid feedback form.');
    if (requestedFormId) {
      const forms = await sql`
        select id, name, active from feedback_forms where id = ${requestedFormId}::uuid
      `;
      if (!forms.length || (!forms[0].active && forms[0].id !== current[0].feedback_form_id)) {
        return bad('That feedback form is unavailable.', 404);
      }
      feedbackFormId = forms[0].id;
      bcu = forms[0].name;
    } else {
      bcu = Object.hasOwn(body, 'legacyBcu')
        ? legacyBcu || null
        : legacyBcu || (current[0].feedback_form_id ? null : current[0].bcu) || null;
    }
  }

  const rows = await sql`
    update candidates
    set name = ${name}, bcu = ${bcu}, feedback_form_id = ${feedbackFormId}::uuid,
        role = ${role || null}, updated_at = now()
    where id = ${id}::uuid
    returning id`;
  if (!rows.length) return bad('Candidate not found.', 404);
    await logAdminAction(admin.email, 'candidate.updated', id);
    return Response.json({ ok: true });
}

// Delete a candidate (their rounds are deleted automatically)
export async function DELETE(_req, { params }) {
    const admin = await getAdmin();
    if (!admin) return bad('Unauthorized', 401);
    const { id } = await params;
    if (!UUID.test(id)) return bad('Invalid request.');
    const rows = await sql`delete from candidates where id = ${id}::uuid returning id`;
    if (rows.length) await logAdminAction(admin.email, 'candidate.deleted', id);
    return Response.json({ ok: true });
}
