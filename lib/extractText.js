import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

// Extracts plain text from a base64-encoded PDF or Word file uploaded from the
// browser. Used by both Job Postings.ai (JDs) and Apply.ai (resumes).
export async function extractText(base64, mimeType) {
  const buffer = Buffer.from(base64, 'base64');

  if (mimeType === 'application/pdf') {
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Plain text fallback (e.g. .txt, or a mimeType the browser didn't set correctly)
  return buffer.toString('utf-8');
}
