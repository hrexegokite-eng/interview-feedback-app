import { neon } from '@neondatabase/serverless';
import { PGlite } from '@electric-sql/pglite';
import path from 'path';

function isNeonConfigured() {
  const url = process.env.DATABASE_URL || '';
  return (
    (url.startsWith('postgres://') || url.startsWith('postgresql://')) &&
    !url.includes('paste-from-neon')
  );
}

const globalForDb = globalThis;

let neonInitPromise = null;
async function ensureNeonInit() {
  if (globalForDb.__neonInitialized) return;
  if (!neonInitPromise) {
    neonInitPromise = (async () => {
      const run = neon(process.env.DATABASE_URL);
      await run`
        CREATE TABLE IF NOT EXISTS candidates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          role TEXT,
          status TEXT NOT NULL DEFAULT 'scheduled',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await run`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS bcu TEXT`;
      await run`
        CREATE TABLE IF NOT EXISTS rounds (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
          round_no INT NOT NULL,
          name TEXT,
          interviewer TEXT,
          scheduled_at TIMESTAMPTZ,
          token TEXT NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text),
          decision TEXT,
          note TEXT,
          submitted_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          meet_link TEXT,
          cv_url TEXT,
          cv_filename TEXT
        )
      `;
      await run`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS meet_link TEXT`;
      await run`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS cv_url TEXT`;
      await run`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS cv_filename TEXT`;

      await run`
        CREATE TABLE IF NOT EXISTS uploads (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          filename TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          size INT NOT NULL,
          data BYTEA NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;

      const check = await run`SELECT count(*)::int as count FROM candidates`;
      if (!check[0]?.count) {
        await seedNeon(run);
      }
      globalForDb.__neonInitialized = true;
    })().catch((err) => {
      neonInitPromise = null;
      console.error('Failed to initialize Neon database:', err);
      throw err;
    });
  }
  return neonInitPromise;
}

async function seedNeon(run) {
  const c1 = await run`
    INSERT INTO candidates (name, role, status)
    VALUES ('Aarav Sharma', 'Senior Travel Consultant', 'scheduled')
    RETURNING id
  `;
  const c1Id = c1[0].id;
  await run`
    INSERT INTO rounds (candidate_id, round_no, name, interviewer, scheduled_at, decision, note, submitted_at)
    VALUES (${c1Id}, 1, 'Initial Screening', 'Ananya Roy', now() - interval '2 days', 'proceed', 'Exceptional sales acumen and destination knowledge (UAE, Europe). Great client communication.', now() - interval '2 days')
  `;
  await run`
    INSERT INTO rounds (candidate_id, round_no, name, interviewer, scheduled_at)
    VALUES (${c1Id}, 2, 'Operations & Client Handling', 'Priya Nair', now() + interval '4 hours')
  `;

  const c2 = await run`
    INSERT INTO candidates (name, role, status)
    VALUES ('Sara Khan', 'Full Stack Developer', 'proceed')
    RETURNING id
  `;
  const c2Id = c2[0].id;
  await run`
    INSERT INTO rounds (candidate_id, round_no, name, interviewer, scheduled_at, decision, note, submitted_at)
    VALUES (${c2Id}, 1, 'Technical Round 1', 'Vikram Mehta', now() - interval '4 days', 'proceed', 'Strong proficiency in Next.js, PostgreSQL, and clean component architecture.', now() - interval '4 days')
  `;
  await run`
    INSERT INTO rounds (candidate_id, round_no, name, interviewer, scheduled_at, decision, note, submitted_at)
    VALUES (${c2Id}, 2, 'System Design & Culture', 'Rohan Verma', now() - interval '1 day', 'proceed', 'Excellent problem solving on booking cache invalidation and travel itineraries.', now() - interval '1 day')
  `;

  const c3 = await run`
    INSERT INTO candidates (name, role, status)
    VALUES ('Dev Patel', 'Customer Experience Specialist', 'hold')
    RETURNING id
  `;
  const c3Id = c3[0].id;
  await run`
    INSERT INTO rounds (candidate_id, round_no, name, interviewer, scheduled_at, decision, note, submitted_at)
    VALUES (${c3Id}, 1, 'Customer Handling Round', 'Neha Gupta', now() - interval '3 days', 'hold', 'Calm demeanour and friendly, but needs verification on handling visa escalation disputes.', now() - interval '3 days')
  `;

  const c4 = await run`
    INSERT INTO candidates (name, role, status)
    VALUES ('Priya Joshi', 'Corporate Sales Manager', 'reject')
    RETURNING id
  `;
  const c4Id = c4[0].id;
  await run`
    INSERT INTO rounds (candidate_id, round_no, name, interviewer, scheduled_at, decision, note, submitted_at)
    VALUES (${c4Id}, 1, 'Hiring Manager Discussion', 'Karan Malhotra', now() - interval '5 days', 'reject', 'Seeking remote-only; role strictly requires visiting corporate partner offices in person.', now() - interval '5 days')
  `;
}

async function getPGlite() {
  if (globalForDb.__pglite) {
    return globalForDb.__pglite;
  }
  if (!globalForDb.__pgliteInitPromise) {
    globalForDb.__pgliteInitPromise = (async () => {
      const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
      const dataDir = isServerless
        ? path.resolve('/tmp', '.pgdata')
        : path.resolve(process.cwd(), '.pgdata');
      const pg = new PGlite(dataDir);

      await pg.exec(`
        CREATE TABLE IF NOT EXISTS candidates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          role TEXT,
          status TEXT NOT NULL DEFAULT 'scheduled',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS rounds (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
          round_no INT NOT NULL,
          name TEXT,
          interviewer TEXT,
          scheduled_at TIMESTAMPTZ,
          token TEXT NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text),
          decision TEXT,
          note TEXT,
          submitted_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          meet_link TEXT,
          cv_url TEXT,
          cv_filename TEXT
        );
        CREATE TABLE IF NOT EXISTS uploads (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          filename TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          size INT NOT NULL,
          data BYTEA NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);

      // Migrations: add new columns if they don't exist yet
      await pg.exec(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='candidates' AND column_name='bcu') THEN
            ALTER TABLE candidates ADD COLUMN bcu TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rounds' AND column_name='meet_link') THEN
            ALTER TABLE rounds ADD COLUMN meet_link TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rounds' AND column_name='cv_url') THEN
            ALTER TABLE rounds ADD COLUMN cv_url TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rounds' AND column_name='cv_filename') THEN
            ALTER TABLE rounds ADD COLUMN cv_filename TEXT;
          END IF;
        END $$;
      `);

      // Seed starter candidates if empty
      const check = await pg.query('SELECT count(*)::int as count FROM candidates');
      if (!check.rows[0]?.count) {
        await seedPGlite(pg);
      }

      globalForDb.__pglite = pg;
      return pg;
    })();
  }
  return globalForDb.__pgliteInitPromise;
}

async function seedPGlite(pg) {
  const c1 = await pg.query(`
    INSERT INTO candidates (name, role, status)
    VALUES ('Aarav Sharma', 'Senior Travel Consultant', 'scheduled')
    RETURNING id
  `);
  const c1Id = c1.rows[0].id;
  await pg.query(
    `INSERT INTO rounds (candidate_id, round_no, name, interviewer, scheduled_at, decision, note, submitted_at)
     VALUES ($1, 1, 'Initial Screening', 'Ananya Roy', now() - interval '2 days', 'proceed', 'Exceptional sales acumen and destination knowledge (UAE, Europe). Great client communication.', now() - interval '2 days')`,
    [c1Id]
  );
  await pg.query(
    `INSERT INTO rounds (candidate_id, round_no, name, interviewer, scheduled_at)
     VALUES ($1, 2, 'Operations & Client Handling', 'Priya Nair', now() + interval '4 hours')`,
    [c1Id]
  );

  const c2 = await pg.query(`
    INSERT INTO candidates (name, role, status)
    VALUES ('Sara Khan', 'Full Stack Developer', 'proceed')
    RETURNING id
  `);
  const c2Id = c2.rows[0].id;
  await pg.query(
    `INSERT INTO rounds (candidate_id, round_no, name, interviewer, scheduled_at, decision, note, submitted_at)
     VALUES ($1, 1, 'Technical Round 1', 'Vikram Mehta', now() - interval '4 days', 'proceed', 'Strong proficiency in Next.js, PostgreSQL, and clean component architecture.', now() - interval '4 days')`,
    [c2Id]
  );
  await pg.query(
    `INSERT INTO rounds (candidate_id, round_no, name, interviewer, scheduled_at, decision, note, submitted_at)
     VALUES ($1, 2, 'System Design & Culture', 'Rohan Verma', now() - interval '1 day', 'proceed', 'Excellent problem solving on booking cache invalidation and travel itineraries.', now() - interval '1 day')`,
    [c2Id]
  );

  const c3 = await pg.query(`
    INSERT INTO candidates (name, role, status)
    VALUES ('Dev Patel', 'Customer Experience Specialist', 'hold')
    RETURNING id
  `);
  const c3Id = c3.rows[0].id;
  await pg.query(
    `INSERT INTO rounds (candidate_id, round_no, name, interviewer, scheduled_at, decision, note, submitted_at)
     VALUES ($1, 1, 'Customer Handling Round', 'Neha Gupta', now() - interval '3 days', 'hold', 'Calm demeanour and friendly, but needs verification on handling visa escalation disputes.', now() - interval '3 days')`,
    [c3Id]
  );

  const c4 = await pg.query(`
    INSERT INTO candidates (name, role, status)
    VALUES ('Priya Joshi', 'Corporate Sales Manager', 'reject')
    RETURNING id
  `);
  const c4Id = c4.rows[0].id;
  await pg.query(
    `INSERT INTO rounds (candidate_id, round_no, name, interviewer, scheduled_at, decision, note, submitted_at)
     VALUES ($1, 1, 'Hiring Manager Discussion', 'Karan Malhotra', now() - interval '5 days', 'reject', 'Seeking remote-only; role strictly requires visiting corporate partner offices in person.', now() - interval '5 days')`,
    [c4Id]
  );
}

// Tagged template function: await sql`select * from candidates where id = ${id}`
export async function sql(strings, ...values) {
  if (isNeonConfigured()) {
    await ensureNeonInit();
    return neon(process.env.DATABASE_URL)(strings, ...values);
  }

  const pg = await getPGlite();
  let query = '';
  const params = [];
  for (let i = 0; i < strings.length; i++) {
    query += strings[i];
    if (i < values.length) {
      params.push(values[i]);
      query += '$' + params.length;
    }
  }
  const res = await pg.query(query, params);
  return res.rows;
}
