import { sql } from '@/lib/db';

const text = (value) => typeof value === 'string' ? value.trim() : '';

function personDetails(data) {
  const details = {
    department: text(data.department),
    designation: text(data.designation),
    dateJoined: text(data.dateOfJoining || data.joined),
    workLocation: text(data.location || data.workLocation),
    bankAccountNumber: text(data.account || data.bankAccountNumber),
    bankName: text(data.bank || data.bankName),
  };
  return Object.fromEntries(Object.entries(details).filter(([, value]) => value));
}

export async function saveHropsPerson(data, actorEmail, personId = '') {
  const name = text(data.employeeName || data.name);
  const employeeId = text(data.employeeId);
  if (!name) return null;
  const profile = JSON.stringify(personDetails(data));

  if (personId) {
    const records = await sql`
      UPDATE hrops_people
      SET name = ${name},
          profile = profile || ${profile}::jsonb,
          updated_at = now()
      WHERE id = ${personId}::uuid
      RETURNING id
    `;
    return records[0]?.id || null;
  }

  const personKey = employeeId
    ? `employee:${employeeId.toLowerCase()}`
    : `name:${name.toLowerCase()}`;

  if (employeeId) {
    const nameOnly = await sql`
      SELECT id
      FROM hrops_people
      WHERE person_key = ${`name:${name.toLowerCase()}`}
        AND employee_id = ''
      LIMIT 1
    `;
    if (nameOnly.length) {
      const updated = await sql`
        UPDATE hrops_people
        SET person_key = ${personKey},
            name = ${name},
            employee_id = ${employeeId},
            profile = profile || ${profile}::jsonb,
            updated_at = now()
        WHERE id = ${nameOnly[0].id}::uuid
        RETURNING id
      `;
      return updated[0].id;
    }
  }

  const records = await sql`
    INSERT INTO hrops_people (person_key, name, employee_id, profile, created_by)
    VALUES (${personKey}, ${name}, ${employeeId}, ${profile}::jsonb, ${actorEmail})
    ON CONFLICT (person_key) DO UPDATE
    SET name = EXCLUDED.name,
        employee_id = CASE WHEN EXCLUDED.employee_id <> '' THEN EXCLUDED.employee_id ELSE hrops_people.employee_id END,
        profile = hrops_people.profile || EXCLUDED.profile,
        updated_at = now()
    RETURNING id
  `;
  return records[0].id;
}
