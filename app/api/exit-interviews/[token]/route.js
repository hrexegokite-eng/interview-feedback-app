import { sql } from '@/lib/db';
import { bad } from '@/lib/auth';

const TOKEN = /^[a-f0-9]{32}$/;

export async function GET(_req, { params }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return bad('Exit interview not found.', 404);
  const rows = await sql`
    select title, description, employee_name, questions, submitted_at
    from exit_interviews where token = ${token}`;
  if (!rows.length) return bad('Exit interview not found.', 404);
  return Response.json(rows[0]);
}

export async function POST(req, { params }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return bad('Exit interview not found.', 404);
  const body = await req.json().catch(() => ({}));
  const rows = await sql`
    select questions, submitted_at from exit_interviews where token = ${token}`;
  if (!rows.length) return bad('Exit interview not found.', 404);
  if (rows[0].submitted_at) return bad('This exit interview has already been submitted.', 409);

  const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)
    ? body.answers
    : {};
  const questions = rows[0].questions;
  for (const question of questions) {
    const answer = String(answers[question.id] || '').trim();
    if (question.required && !answer) return bad(`Please answer: ${question.label}`);
    if (answer.length > 5000) return bad('Each answer must be 5,000 characters or fewer.');
  }
  const cleanAnswers = Object.fromEntries(questions.map((q) => [q.id, String(answers[q.id] || '').trim().slice(0, 5000)]));
  const result = await sql`
    update exit_interviews set answers = ${JSON.stringify(cleanAnswers)}::jsonb, submitted_at = now()
    where token = ${token} and submitted_at is null
    returning id`;
  if (!result.length) return bad('This exit interview has already been submitted.', 409);
  return Response.json({ ok: true });
}
