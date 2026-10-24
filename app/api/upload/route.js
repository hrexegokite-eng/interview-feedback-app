import { getAdmin, bad } from '@/lib/auth';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!(await getAdmin())) return bad('Unauthorized', 401);

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return bad('No file uploaded.');
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const originalName = file.name || 'resume.pdf';
    const mimeType = file.type || 'application/pdf';
    const hex = buffer.toString('hex');

    const rows = await sql`
      INSERT INTO uploads (filename, mime_type, size, data)
      VALUES (${originalName}, ${mimeType}, ${file.size}, decode(${hex}, 'hex'))
      RETURNING id
    `;

    return Response.json({
      url: `/api/uploads/${rows[0].id}`,
      filename: originalName,
      size: file.size,
    });
  } catch (err) {
    console.error('File upload error:', err);
    return bad('Failed to upload file: ' + (err.message || String(err)), 500);
  }
}
