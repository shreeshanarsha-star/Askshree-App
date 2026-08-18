'use client';
import { useEffect, useRef, useState } from 'react';

// YouTube's IFrame Player API, loaded once and shared across mounts --
// this is the actual fix for "voice commands should really play it, not
// just show a link": creating and controlling a real <iframe> with
// JavaScript is NOT window.open(), so it doesn't hit the "lost the user
// gesture by the time the async voice transcript resolved" popup-blocker
// wall that the old approach did. autoplay=1 works here because the
// reactor click (or wake word) that started the whole conversation already
// counted as real interaction with the page, which is what Chrome's
// autoplay allowance actually keys off -- not a fresh gesture every call.
let iframeApiPromise = null;
function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (iframeApiPromise) return iframeApiPromise;
  iframeApiPromise = new Promise((resolve) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve(window.YT);
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return iframeApiPromise;
}

export default function YouTubePlayerWidget({ videoId, playlistId }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const mountIdRef = useRef(`yt-player-${Math.random().toString(36).slice(2)}`);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled || !YT || !containerRef.current) return;
      try {
        playerRef.current = new YT.Player(containerRef.current, {
          height: '100%',
          width: '100%',
          videoId: playlistId ? undefined : videoId,
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            rel: 0,
            ...(playlistId ? { listType: 'playlist', list: playlistId } : {}),
          },
          events: {
            onError: () => setError("Couldn't play that on YouTube (it may be restricted or unavailable)."),
          },
        });
      } catch (e) {
        setError("Couldn't load the YouTube player.");
      }
    });

    return () => {
      cancelled = true;
      try { playerRef.current?.destroy?.(); } catch (e) { /* already gone */ }
      playerRef.current = null;
    };
  }, [videoId, playlistId]);

  if (!videoId && !playlistId) return null;

  if (error) {
    return (
      <div className="home2-workspace-soon">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div ref={containerRef} id={mountIdRef.current} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
