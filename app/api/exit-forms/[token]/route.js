import { sql } from '@/lib/db';
import { bad } from '@/lib/auth';

const TOKEN = /^[a-f0-9]{64}$/;
const EXPERIENCE_AREAS = [
  'workEnvironment',
  'relationshipWithManager',
  'salaryAndBenefits',
  'careerGrowth',
  'trainingAndSupport',
  'workLifeBalance',
];
const RATINGS = ['Excellent', 'Good', 'Average', 'Poor'];
const YES_NO = ['Yes', 'No'];

function clean(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validate(body) {
  const fields = {
    employeeName: clean(body.employeeName, 150),
    employeeId: clean(body.employeeId, 80),
    department: clean(body.department, 150),
    designation: clean(body.designation, 150),
    dateOfJoining: clean(body.dateOfJoining, 10),
    lastWorkingDay: clean(body.lastWorkingDay, 10),
    reportingManager: clean(body.reportingManager, 150),
    primaryReason: clean(body.primaryReason, 2000),
    acceptedAnotherJob: body.acceptedAnotherJob,
    newOpportunityAttraction: clean(body.newOpportunityAttraction, 2000),
    retentionSuggestions: clean(body.retentionSuggestions, 2000),
    experience: body.experience,
    likedMost: clean(body.likedMost, 2000),
    challenges: clean(body.challenges, 2000),
    improvements: clean(body.improvements, 2000),
    wouldRejoin: body.wouldRejoin,
    knowledgeHandover: body.knowledgeHandover,
    assetsReturned: body.assetsReturned,
    pendingTasks: clean(body.pendingTasks, 2000),
  };

  const required = [
    'employeeName', 'employeeId', 'department', 'designation',
    'reportingManager', 'primaryReason', 'retentionSuggestions',
    'likedMost', 'challenges', 'improvements',
  ];
  if (required.some((key) => !fields[key])) return { error: 'Please complete all required fields.' };
  if (!validDate(fields.dateOfJoining) || !validDate(fields.lastWorkingDay)) {
    return { error: 'Enter valid joining and last working dates.' };
  }
  if (fields.dateOfJoining > fields.lastWorkingDay) {
    return { error: 'The last working day must be on or after the joining date.' };
  }
  if (!YES_NO.includes(fields.acceptedAnotherJob)) return { error: 'Please answer whether you accepted another job.' };
  if (fields.acceptedAnotherJob === 'Yes' && !fields.newOpportunityAttraction) {
    return { error: 'Please describe the main attraction of the new opportunity.' };
  }
  if (!fields.experience || typeof fields.experience !== 'object' ||
      EXPERIENCE_AREAS.some((area) => !RATINGS.includes(fields.experience[area]))) {
    return { error: 'Please select a rating for each employee experience item.' };
  }
  fields.experience = Object.fromEntries(EXPERIENCE_AREAS.map((area) => [area, fields.experience[area]]));
  if (!['Yes', 'No', 'Maybe'].includes(fields.wouldRejoin)) {
    return { error: 'Please answer whether you would consider rejoining.' };
  }
  if (!YES_NO.includes(fields.knowledgeHandover)) return { error: 'Please complete the knowledge handover status.' };
  if (!['Yes', 'No', 'Not Applicable'].includes(fields.assetsReturned)) {
    return { error: 'Please complete the company assets status.' };
  }

  return { fields };
}

export async function GET(_req, { params }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return bad('Form link not found.', 404);
  const rows = await sql`select submitted_at from exit_forms where token = ${token}`;
  if (!rows.length) return bad('Form link not found.', 404);
  return Response.json({ submitted: !!rows[0].submitted_at });
}

export async function POST(req, { params }) {
  const { token } = await params;
  if (!TOKEN.test(token)) return bad('Form link not found.', 404);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('Invalid form submission.');
  const { fields, error } = validate(body);
  if (error) return bad(error);

  const rows = await sql`
    update exit_forms
    set responses = ${JSON.stringify(fields)}::jsonb, submitted_at = now()
    where token = ${token} and submitted_at is null
    returning token`;
  if (!rows.length) {
    const exists = await sql`select 1 from exit_forms where token = ${token}`;
    return exists.length ? bad('This form has already been submitted.', 409) : bad('Form link not found.', 404);
  }
  return Response.json({ ok: true });
}
