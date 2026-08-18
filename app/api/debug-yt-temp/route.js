export const dynamic = 'force-dynamic';

export async function GET() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return new Response('NOT_CONFIGURED', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  const params = new URLSearchParams({
    part: 'snippet',
    q: 'lofi hip hop radio',
    type: 'video',
    maxResults: '1',
    key,
  });
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
    const body = await res.text();
    return new Response(`status=${res.status}\n${body.slice(0, 900)}`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (e) {
    return new Response(`NETWORK_ERROR\n${e?.message || e}`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
