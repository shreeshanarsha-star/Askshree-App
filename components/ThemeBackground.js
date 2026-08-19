'use client';
import { useEffect, useRef } from 'react';
import { getTheme } from '../lib/themes';

// Single animated canvas that renders one of 6 moods depending on the
// active theme's `mode`. Every mode has real motion (rotation, drift,
// twinkle, orbiting) -- a still gradient reads as decoration, animation
// reads as "the site is alive". Kept to one canvas + one rAF loop for
// performance regardless of how many themes exist.
// `anchorSelector`, if given, is a CSS selector for a real DOM element to
// center-and-size the 'blackhole' ring on every frame, instead of the
// generic viewport-relative default -- this is what makes the ring
// actually wrap around a specific thing (the reactor's own node ring) on
// pages that have one, rather than being a decorative backdrop that
// happens to be somewhere behind it. Ignored for every other mode, and
// silently falls back to the default centering if the element isn't
// found (e.g. still mounting, or on pages that don't have it at all).
export default function ThemeBackground({ themeId, anchorSelector }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ pts: [], t: 0 });

  useEffect(() => {
    const theme = getTheme(themeId);
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    let W = 0, H = 0, raf;
    const color = theme.particleColor;

    function sized() {
      const rect = c.parentElement.getBoundingClientRect();
      W = Math.max(rect.width, window.innerWidth, 300);
      H = Math.max(rect.height, document.body.scrollHeight, 600);
      c.width = W;
      c.height = H;
      seed();
    }

    function seed() {
      const s = stateRef.current;
      const count = theme.mode === 'deepfield' ? 260 : theme.mode === 'nebula' ? 70 : theme.mode === 'blackhole' ? 190 : 130;
      s.pts = Array.from({ length: count }, (_, i) => {
        if (theme.mode === 'spiral') {
          const arm = i % 3;
          const r = (i / count) * Math.max(W, H) * 0.55;
          const baseAngle = (i * 0.35) + (arm * (Math.PI * 2 / 3));
          return { r, baseAngle, size: 0.6 + Math.random() * 1.8, tw: Math.random() * Math.PI * 2 };
        }
        if (theme.mode === 'blackhole') {
          const angle = Math.random() * Math.PI * 2;
          // rOffset (not an absolute radius) -- most points sit within a
          // tight +/-45px band, a handful further out for depth. Actual
          // on-screen radius = ring radius (known only per-frame, see
          // tick()) + this offset, so the whole cluster tracks the ring
          // wherever it currently is -- e.g. hugging the belt exactly
          // when anchored to the reactor's real node ring, instead of
          // being smeared thinly across a huge, mostly-empty area.
          const tight = Math.random() < 0.82;
          const rOffset = tight ? (Math.random() - 0.5) * 90 : (Math.random() - 0.5) * 260;
          return { angle, rOffset, speed: 0.003 + Math.random() * 0.005, size: tight ? 1.6 + Math.random() * 2.8 : 0.8 + Math.random() * 1.6 };
        }
        if (theme.mode === 'sunrise') {
          return { x: Math.random() * W, y: Math.random() * H * 0.55, size: 0.5 + Math.random() * 1.4, tw: Math.random() * Math.PI * 2 };
        }
        // network, nebula, deepfield: free-floating points
        return {
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * (theme.mode === 'network' ? 0.5 : 0.12),
          vy: (Math.random() - 0.5) * (theme.mode === 'network' ? 0.5 : 0.12),
          size: theme.mode === 'nebula' ? 60 + Math.random() * 120 : 0.6 + Math.random() * 1.8,
          tw: Math.random() * Math.PI * 2,
        };
      });
    }

    sized();
    window.addEventListener('resize', sized);
    const rt = setTimeout(sized, 300);

    function handleVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(tick);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    function tick() {
      const s = stateRef.current;
      s.t += 1;
      ctx.clearRect(0, 0, W, H);

      if (theme.mode === 'spiral') {
        const cx = W * 0.5, cy = H * 0.42;
        s.pts.forEach((p) => {
          const angle = p.baseAngle + s.t * 0.0011;
          const x = cx + Math.cos(angle) * p.r;
          const y = cy + Math.sin(angle) * p.r * 0.62;
          const flicker = 0.5 + 0.5 * Math.sin(s.t * 0.02 + p.tw);
          ctx.beginPath();
          ctx.fillStyle = `rgba(${color},${0.25 + flicker * 0.55})`;
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (theme.mode === 'blackhole') {
        // Default: generic viewport-relative centering (used on pages
        // with no anchor, e.g. Settings/About/Contact). If an anchor
        // element is given and found, use ITS live center + radius
        // instead -- read fresh every frame so it tracks layout changes
        // (e.g. the homepage triptych's columns resizing when a tool
        // panel opens) without needing a resize-listener of its own.
        let cx = W * 0.5, cy = H * 0.42;
        let radius = Math.max(240, Math.min(W, H) * 0.4);
        if (anchorSelector) {
          const anchorEl = document.querySelector(anchorSelector);
          if (anchorEl) {
            const aRect = anchorEl.getBoundingClientRect();
            const pRect = c.parentElement.getBoundingClientRect();
            cx = aRect.left + aRect.width / 2 - pRect.left;
            cy = aRect.top + aRect.height / 2 - pRect.top;
            radius = Math.max(aRect.width, aRect.height) / 2;
          }
        }
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grd.addColorStop(0, 'rgba(0,0,0,1)');
        grd.addColorStop(0.55, 'rgba(0,0,0,0.9)');
        grd.addColorStop(0.75, `rgba(${color},0.32)`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        // A crisp glowing rim ring on top of the soft gradient -- the
        // gradient alone reads as a vague glow; a real stroked circle is
        // what makes it unmistakably "a ring", matching the reference
        // look, and it visibly pulses so it's not just a static line.
        // Thicker + brighter than the first pass, which was reading as
        // barely distinguishable from the reactor's own thin UI ring.
        const ringPulse = 0.5 + 0.5 * Math.sin(s.t * 0.015);
        const ringR = anchorSelector ? radius : radius * 0.78;
        // When anchored to a real UI element (the reactor), the theme's
        // own particle color reads as invisible -- it's the SAME pale
        // color as the reactor's own tick marks/rings/icon borders (they
        // all follow the site accent, which the theme also drives), so
        // two different things drawn in one color visually merge into
        // one flat surface instead of standing apart. A near-white,
        // fully-saturated glow cuts through regardless of which theme is
        // active, so the belt reads as its own distinct layer. Untouched
        // (still theme-colored) on pages with no anchor.
        const beltColor = anchorSelector ? '235,245,255' : color;
        ctx.save();
        ctx.strokeStyle = `rgba(${beltColor},${0.85 + ringPulse * 0.15})`;
        ctx.lineWidth = anchorSelector ? 3 : 4;
        ctx.shadowColor = `rgba(${beltColor},1)`;
        ctx.shadowBlur = anchorSelector ? 34 : 26;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        s.pts.forEach((p) => {
          p.angle += p.speed;
          const r = ringR + p.rOffset;
          const x = cx + Math.cos(p.angle) * r;
          const y = cy + Math.sin(p.angle) * r;
          const nearRim = Math.abs(p.rOffset) < 45 ? 1 : 0.4;
          ctx.beginPath();
          ctx.fillStyle = `rgba(${beltColor},${0.5 + nearRim * 0.5})`;
          if (nearRim === 1) {
            ctx.shadowColor = `rgba(${beltColor},0.9)`;
            ctx.shadowBlur = 8;
          } else {
            ctx.shadowBlur = 0;
          }
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.shadowBlur = 0;
      } else if (theme.mode === 'nebula') {
        s.pts.forEach((p, i) => {
          if (p.size > 20) {
            p.x += p.vx * 0.4; p.y += p.vy * 0.4;
            if (p.x < -200) p.x = W + 200; if (p.x > W + 200) p.x = -200;
            if (p.y < -200) p.y = H + 200; if (p.y > H + 200) p.y = -200;
            const pulse = 0.5 + 0.5 * Math.sin(s.t * 0.006 + i);
            const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            grd.addColorStop(0, `rgba(${color},${0.10 + pulse * 0.08})`);
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > W) p.vx *= -1;
            if (p.y < 0 || p.y > H) p.vy *= -1;
            const flicker = 0.4 + 0.6 * Math.sin(s.t * 0.03 + p.tw);
            ctx.beginPath();
            ctx.fillStyle = `rgba(255,255,255,${flicker * 0.6})`;
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      } else if (theme.mode === 'sunrise') {
        const cx = W * 0.5, cy = H * 1.02;
        const pulse = 0.5 + 0.5 * Math.sin(s.t * 0.008);
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.55);
        grd.addColorStop(0, `rgba(${color},${0.30 + pulse * 0.12})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, W * 0.55, 0, Math.PI * 2);
        ctx.fill();
        s.pts.forEach((p) => {
          const flicker = 0.3 + 0.7 * Math.sin(s.t * 0.02 + p.tw);
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,255,255,${flicker * 0.7})`;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (theme.mode === 'network') {
        s.pts.forEach((p) => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
        });
        for (let i = 0; i < s.pts.length; i++) {
          for (let j = i + 1; j < s.pts.length; j++) {
            const a = s.pts[i], b = s.pts[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < 140) {
              ctx.strokeStyle = `rgba(${color},${0.16 * (1 - d / 140)})`;
              ctx.lineWidth = 0.7;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
        s.pts.forEach((p) => {
          ctx.beginPath();
          ctx.fillStyle = `rgba(${color},0.75)`;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (theme.mode === 'deepfield') {
        s.pts.forEach((p) => {
          const flicker = 0.25 + 0.75 * Math.sin(s.t * 0.015 + p.tw);
          ctx.beginPath();
          ctx.fillStyle = `rgba(${color},${flicker * 0.85})`;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', sized);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearTimeout(rt);
      cancelAnimationFrame(raf);
    };
  }, [themeId, anchorSelector]);

  const theme = getTheme(themeId);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: -1, background: theme.gradient }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  );
}
