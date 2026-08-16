import { NextResponse } from 'next/server';

// Server-side only, on purpose: NewsAPI.org's free "Developer" plan blocks
// requests that carry a browser Origin header (their corsNotAllowed error,
// confirmed live from askshree.com's own origin), but has no such
// restriction on plain server-to-server requests. A Next.js API route
// calling out from Vercel's serverless runtime never sends an Origin
// header, so it sidesteps that restriction entirely -- calling NewsAPI
// directly from client-side code would not work on this plan.
export async function POST(req) {
  const { query } = await req.json().catch(() => ({}));
  const key = process.env.NEWS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "News isn't set up yet — ask the site owner to add a news API key." });
  }

  // top-headlines only searches a small curated set, so a topic "q" against
  // it (confirmed live: "artificial intelligence" -> 0 results) very often
  // comes back empty. /v2/everything searches the full article archive and
  // is the right endpoint once there's an actual topic; top-headlines stays
  // the default for a bare "what's the news" with no topic.
  const hasTopic = !!(query && query.trim());
  const endpoint = hasTopic ? 'everything' : 'top-headlines';
  const params = new URLSearchParams({ apiKey: key, pageSize: '6', language: 'en' });
  if (hasTopic) { params.set('q', query.trim()); params.set('sortBy', 'publishedAt'); }
  else params.set('country', 'us');

  try {
    const res = await fetch(`https://newsapi.org/v2/${endpoint}?${params.toString()}`);
    const data = await res.json();
    if (data.status !== 'ok') {
      return NextResponse.json({ error: data.message || "Couldn't fetch news right now." });
    }
    const items = (data.articles || [])
      .filter((a) => a.title && a.title !== '[Removed]')
      .map((a) => ({ title: a.title, url: a.url, source: a.source?.name || '' }));
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: 'Network error reaching the news service.' });
  }
}
