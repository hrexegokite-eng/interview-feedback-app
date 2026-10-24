import { getAdmin, bad } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

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

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const originalName = file.name || 'resume.pdf';
    const ext = path.extname(originalName) || '.pdf';
    const cleanBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${cleanBase}${ext}`;
    const filePath = path.join(uploadDir, uniqueName);

    await writeFile(filePath, buffer);

    return Response.json({
      url: `/uploads/${uniqueName}`,
      filename: originalName,
      size: file.size,
    });
  } catch (err) {
    console.error('File upload error:', err);
    return bad('Failed to upload file.', 500);
  }
}
