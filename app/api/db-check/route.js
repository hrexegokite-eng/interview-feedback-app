import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || '';
  const isNeon = (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) &&
    !dbUrl.includes('paste-from-neon');

  try {
    const start = Date.now();
    const rows = await sql`
      SELECT count(*)::int as count,
             (SELECT count(*)::int FROM rounds) as rounds_count
      FROM candidates
    `;
    const elapsed = Date.now() - start;

    return Response.json({
      status: 'connected',
      provider: isNeon ? 'Neon Serverless Postgres' : 'Embedded PGlite (/tmp)',
      database_url_configured: isNeon,
      candidates_count: rows[0]?.count ?? 0,
      rounds_count: rows[0]?.rounds_count ?? 0,
      query_latency_ms: elapsed,
    });
  } catch (err) {
    return Response.json({
      status: 'error',
      provider: isNeon ? 'Neon Serverless Postgres' : 'Embedded PGlite (/tmp)',
      database_url_configured: isNeon,
      error_message: err.message || String(err),
      hint: !isNeon
        ? 'DATABASE_URL is not configured in Vercel. Add your Neon Postgres connection string in Vercel -> Settings -> Environment Variables.'
        : 'Connection to Neon failed. Verify your Neon database is active and the connection string is correct.',
    }, { status: 500 });
  }
}
