import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Resolves a spoken phrase ("play some lofi music", "play the anime openings
// playlist") into a real YouTube video or playlist ID via the YouTube Data
// API v3 search endpoint, so the reactor can actually embed and autoplay it
// instead of just handing back a search-results link. Needs YOUTUBE_API_KEY
// (free, no card -- see console.cloud.google.com, enable "YouTube Data API
// v3", create an API key). search.list costs 100 quota units per call
// against a 10,000/day free quota, so roughly 100 of these a day.
export async function POST(req) {
  const { query, type } = await req.json().catch(() => ({}));
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || !query || !query.trim()) {
    // 501 so the client can tell "not configured / nothing to search" apart
    // from a real upstream failure and fall back to the old link-card
    // behavior silently, without treating it as an error.
    return NextResponse.json({ error: 'not_configured' }, { status: 501 });
  }

  const searchType = type === 'playlist' ? 'playlist' : 'video';
  const params = new URLSearchParams({
    part: 'snippet',
    q: query.slice(0, 200),
    type: searchType,
    maxResults: '1',
    safeSearch: 'moderate',
    key,
  });

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return NextResponse.json({ error: body || 'youtube_error' }, { status: 502 });
    }
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return NextResponse.json({ error: 'no_results' }, { status: 404 });

    const title = item.snippet?.title || query;
    if (searchType === 'playlist') {
      return NextResponse.json({ playlistId: item.id?.playlistId, title });
    }
    return NextResponse.json({ videoId: item.id?.videoId, title });
  } catch (e) {
    return NextResponse.json({ error: 'network_error' }, { status: 502 });
  }
}
