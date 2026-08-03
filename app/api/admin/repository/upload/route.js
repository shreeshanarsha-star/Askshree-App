import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/requireAdmin';

export async function POST(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const form = await req.formData();
  const file = form.get('file');
  if (!file) return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = '';

  try {
    if (file.name.toLowerCase().endsWith('.pdf')) {
      const pdfParse = (await import('pdf-parse')).default;
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else if (file.name.toLowerCase().endsWith('.docx')) {
      const mammoth = (await import('mammoth')).default;
      const parsed = await mammoth.extractRawText({ buffer });
      text = parsed.value;
    } else {
      text = buffer.toString('utf-8');
    }
  } catch (err) {
    return NextResponse.json({ error: 'Could not read that file.' }, { status: 400 });
  }

  return NextResponse.json({ text, label: file.name });
}
