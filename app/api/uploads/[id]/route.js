import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { id } = await params;

  try {
    const rows = await sql`
      SELECT filename, mime_type, size, encode(data, 'base64') as base64_data
      FROM uploads
      WHERE id = ${id}
    `;

    if (!rows.length) {
      return new Response('File not found', { status: 404 });
    }

    const file = rows[0];
    const buffer = Buffer.from(file.base64_data, 'base64');

    return new Response(buffer, {
      headers: {
        'Content-Type': file.mime_type || 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.filename)}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('File retrieval error:', err);
    return new Response('Failed to retrieve file', { status: 500 });
  }
}
