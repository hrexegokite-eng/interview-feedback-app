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

function isProduction() {
  return process.env.NODE_ENV === 'production';
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

      globalForDb.__neonInitialized = true;
    })().catch((err) => {
      neonInitPromise = null;
      console.error('Failed to initialize Neon database:', err);
      throw err;
    });
  }
  return neonInitPromise;
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

      globalForDb.__pglite = pg;
      return pg;
    })();
  }
  return globalForDb.__pgliteInitPromise;
}

// Tagged template function: await sql`select * from candidates where id = ${id}`
export async function sql(strings, ...values) {
  if (isNeonConfigured()) {
    await ensureNeonInit();
    return neon(process.env.DATABASE_URL)(strings, ...values);
  }

  if (isProduction()) {
    throw new Error('DATABASE_URL must be configured with a PostgreSQL connection string in production.');
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
