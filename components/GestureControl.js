'use client';
import { useEffect, useRef } from 'react';

// Silent, camera-driven swipe control for Feature Display.
// No visible UI, no camera preview on screen — MediaPipe Hands runs on a
// hidden <video> element in the background and watches for a fast
// right-to-left hand swipe, which we translate into a click on the
// existing "next page" arrow (".orb2-page-btn-down") already wired up in
// OrbitalSystems.js. Clicking a disabled button is a browser no-op, so
// this naturally respects the panel's own page bounds.
//
// Direction note: hands.setOptions({ selfieMode: true }) mirrors the
// tracked x-coordinate the way a person naturally sees themselves (like a
// mirror), so "swipe from your right to your left" should show up as x
// DECREASING over time. This hasn't been verified against a live camera —
// if it fires on the opposite motion, flip REVERSE to true below.
const REVERSE = false;
const WINDOW_MS = 450;
const MIN_DELTA = 0.32;
const COOLDOWN_MS = 1000;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve();
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

export default function GestureControl() {
  const videoRef = useRef(null);
  const historyRef = useRef([]);
  const lastTriggerRef = useRef(0);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    function onResults(results) {
      const lm = results.multiHandLandmarks && results.multiHandLandmarks[0];
      if (!lm) return;
      const palmX = (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5;
      const now = performance.now();
      const hist = historyRef.current;
      hist.push({ t: now, x: palmX });
      while (hist.length && now - hist[0].t > WINDOW_MS) hist.shift();
      if (hist.length < 2) return;

      const delta = palmX - hist[0].x; // negative = moved right -> left (mirrored view)
      const triggered = REVERSE ? delta >= MIN_DELTA : delta <= -MIN_DELTA;
      if (triggered && now - lastTriggerRef.current > COOLDOWN_MS) {
        lastTriggerRef.current = now;
        document.querySelector('.orb2-page-btn-down')?.click();
        historyRef.current = [];
      }
    }

    async function init() {
      try {
        await Promise.all([
          loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'),
          loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
        ]);
        if (cancelled || !window.Hands || !window.Camera || !videoRef.current) return;

        const hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.5,
          selfieMode: true,
        });
        hands.onResults(onResults);
        handsRef.current = hands;

        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (handsRef.current) await handsRef.current.send({ image: videoRef.current });
          },
          width: 320,
          height: 240,
        });
        cameraRef.current = camera;
        camera.start();
      } catch (e) {
        // No camera, permission denied, or CDN unreachable — fail silent,
        // gesture control simply isn't available this session.
      }
    }

    init();
    return () => {
      cancelled = true;
      try { cameraRef.current?.stop(); } catch (e) { /* ignore */ }
      try { handsRef.current?.close(); } catch (e) { /* ignore */ }
      const stream = videoRef.current?.srcObject;
      if (stream) stream.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  return (
    <video
      ref={videoRef}
      playsInline
      muted
      aria-hidden="true"
      style={{ position: 'fixed', top: 0, left: 0, width: 2, height: 2, opacity: 0, pointerEvents: 'none' }}
    />
  );
}
