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
const superAdminEmail = () => (process.env.SUPER_ADMIN_EMAIL || 'hrops@gokitetours.com').trim().toLowerCase();

let neonInitPromise = null;
let managementSchemaPromise = null;
let feedbackFormsSchemaPromise = null;

function createPGliteRunner(pg) {
  return (strings, ...values) => {
    let query = '';
    const params = [];
    for (let i = 0; i < strings.length; i++) {
      query += strings[i];
      if (i < values.length) {
        params.push(values[i]);
        query += '$' + params.length;
      }
    }
    return pg.query(query, params).then((result) => result.rows);
  };
}

async function ensureCandidateStatusConstraint(run, runtime) {
  const initializedKey = `__${runtime}CandidateStatusConstraintInitialized`;
  const promiseKey = `__${runtime}CandidateStatusConstraintPromise`;
  if (globalForDb[initializedKey]) return;
  if (!globalForDb[promiseKey]) {
    globalForDb[promiseKey] = (async () => {
      await run`ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_status_check`;
      await run`
        ALTER TABLE candidates ADD CONSTRAINT candidates_status_check
        CHECK (status IN ('scheduled', 'proceed', 'hold', 'reject', 'complete'))
      `;
      globalForDb[initializedKey] = true;
    })().catch((error) => {
      globalForDb[promiseKey] = null;
      throw error;
    });
  }
  return globalForDb[promiseKey];
}

async function ensureManagementSchema(run) {
  if (globalForDb.__managementSchemaInitialized) return;
  if (!managementSchemaPromise) {
    managementSchemaPromise = (async () => {
      await run`
        CREATE TABLE IF NOT EXISTS admin_users (
          email TEXT PRIMARY KEY,
          role TEXT NOT NULL CHECK (role IN ('admin', 'superadmin')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          created_by TEXT
        )
      `;
      await run`
        CREATE TABLE IF NOT EXISTS workspace_modules (
          key TEXT PRIMARY KEY,
          enabled BOOLEAN NOT NULL DEFAULT false,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by TEXT
        )
      `;
      await run`
        CREATE TABLE IF NOT EXISTS admin_module_access (
          admin_email TEXT NOT NULL REFERENCES admin_users(email) ON DELETE CASCADE,
          module_key TEXT NOT NULL REFERENCES workspace_modules(key) ON DELETE CASCADE,
          enabled BOOLEAN NOT NULL DEFAULT false,
          PRIMARY KEY (admin_email, module_key)
        )
      `;
      await run`
        CREATE TABLE IF NOT EXISTS admin_audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          actor_email TEXT NOT NULL,
          action TEXT NOT NULL,
          target TEXT,
          details JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await run`
        INSERT INTO admin_users (email, role) VALUES (${superAdminEmail()}, 'superadmin')
        ON CONFLICT (email) DO UPDATE SET role = 'superadmin'
      `;
      await run`
        UPDATE admin_users SET role = 'admin'
        WHERE role = 'superadmin' AND email <> ${superAdminEmail()}
      `;
      await run`
        INSERT INTO workspace_modules (key, enabled) VALUES
          ('interview-feedback', true),
          ('exit-form', false),
          ('fnf', true)
        ON CONFLICT (key) DO NOTHING
      `;
      await run`
        INSERT INTO admin_module_access (admin_email, module_key, enabled)
        SELECT a.email, m.key, m.enabled
        FROM admin_users a CROSS JOIN workspace_modules m
        ON CONFLICT (admin_email, module_key) DO NOTHING
      `;
      await run`
        CREATE TABLE IF NOT EXISTS fnf_settlements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_name TEXT NOT NULL,
          employee_name TEXT NOT NULL,
          employee_id TEXT NOT NULL DEFAULT '',
          data JSONB NOT NULL,
          created_by TEXT REFERENCES admin_users(email) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await run`CREATE INDEX IF NOT EXISTS fnf_settlements_updated_at_idx ON fnf_settlements (updated_at DESC)`;
      globalForDb.__managementSchemaInitialized = true;
    })().catch((err) => {
      managementSchemaPromise = null;
      throw err;
    });
  }
  return managementSchemaPromise;
}

async function ensureFeedbackFormsSchema(run) {
  if (globalForDb.__feedbackFormsSchemaInitialized) return;
  if (!feedbackFormsSchemaPromise) {
    feedbackFormsSchemaPromise = (async () => {
      await run`
        CREATE TABLE IF NOT EXISTS feedback_forms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          questions JSONB NOT NULL,
          version INT NOT NULL DEFAULT 1,
          active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await run`CREATE UNIQUE INDEX IF NOT EXISTS feedback_forms_name_unique ON feedback_forms (lower(name))`;
      await run`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS feedback_form_id UUID REFERENCES feedback_forms(id) ON DELETE SET NULL`;
      await run`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS form_snapshot JSONB`;
      globalForDb.__feedbackFormsSchemaInitialized = true;
    })().catch((error) => {
      feedbackFormsSchemaPromise = null;
      throw error;
    });
  }
  return feedbackFormsSchemaPromise;
}

async function ensureNeonInit() {
  const run = neon(process.env.DATABASE_URL);
  if (globalForDb.__neonInitialized) {
    await ensureCandidateStatusConstraint(run, 'neon');
    await ensureManagementSchema(run);
    await ensureFeedbackFormsSchema(run);
    return;
  }
  if (!neonInitPromise) {
    neonInitPromise = (async () => {
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
      await ensureCandidateStatusConstraint(run, 'neon');
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
      await run`ALTER TABLE rounds ADD COLUMN IF NOT EXISTS evaluation JSONB`;

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
      await run`
        CREATE TABLE IF NOT EXISTS exit_forms (
          token TEXT PRIMARY KEY,
          responses JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          submitted_at TIMESTAMPTZ
        )
      `;
      await ensureManagementSchema(run);
      await ensureFeedbackFormsSchema(run);
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
    const pg = globalForDb.__pglite;
    const run = createPGliteRunner(pg);
    await ensureCandidateStatusConstraint(run, 'pglite');
    if (!globalForDb.__managementSchemaInitialized) {
      await ensureManagementSchema(run);
    }
    await ensureFeedbackFormsSchema(run);
    return pg;
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
        CREATE TABLE IF NOT EXISTS exit_forms (
          token TEXT PRIMARY KEY,
          responses JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          submitted_at TIMESTAMPTZ
        );
      `);
      const run = createPGliteRunner(pg);
      await ensureCandidateStatusConstraint(run, 'pglite');
      await ensureManagementSchema(run);
      await ensureFeedbackFormsSchema(run);

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
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='rounds' AND column_name='evaluation') THEN
            ALTER TABLE rounds ADD COLUMN evaluation JSONB;
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
