import { sql } from '@/lib/db';
import { getAdmin, bad } from '@/lib/auth';

const UUID = /^[0-9a-f-]{36}$/i;

export async function PATCH(req, { params }) {
  if (!(await getAdmin())) return bad('Unauthorized', 401);
  const { id, roundId } = await params;
  if (!UUID.test(id) || !UUID.test(roundId)) return bad('Invalid request.');

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('Invalid request.');
  const roundName = typeof body.roundName === 'string' ? body.roundName.trim() : '';
  const interviewer = typeof body.interviewer === 'string' ? body.interviewer.trim() : '';
  const meetLink = typeof body.meetLink === 'string' ? body.meetLink.trim() : '';
  const cvUrl = typeof body.cvUrl === 'string' ? body.cvUrl.trim() : '';
  const cvFilename = typeof body.cvFilename === 'string' ? body.cvFilename.trim() : '';
  const when = body.when || null;

  if (!interviewer) return bad('Interviewer name is required.');
  if (when !== null && (typeof when !== 'string' || Number.isNaN(Date.parse(when)))) return bad('Enter a valid interview date and time.');
  if (roundName.length > 120 || interviewer.length > 200 || meetLink.length > 2000 || cvUrl.length > 2000 || cvFilename.length > 255) {
    return bad('One or more fields exceed the maximum length.');
  }

  const rows = await sql`
    update rounds
    set name = ${roundName || null}, interviewer = ${interviewer},
        scheduled_at = ${when}::timestamptz, meet_link = ${meetLink || null},
        cv_url = ${cvUrl || null}, cv_filename = ${cvFilename || null}
    where id = ${roundId}::uuid and candidate_id = ${id}::uuid and decision is null
    returning id`;
  if (!rows.length) return bad('Scheduled interview not found or feedback has already been submitted.', 404);
  await sql`update candidates set updated_at = now() where id = ${id}::uuid`;
  return Response.json({ ok: true });
}
