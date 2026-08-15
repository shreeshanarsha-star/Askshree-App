'use client';
import { useEffect, useRef } from 'react';
import { getTheme } from '../lib/themes';

// Single animated canvas that renders one of 6 moods depending on the
// active theme's `mode`. Every mode has real motion (rotation, drift,
// twinkle, orbiting) -- a still gradient reads as decoration, animation
// reads as "the site is alive". Kept to one canvas + one rAF loop for
// performance regardless of how many themes exist.
export default function ThemeBackground({ themeId }) {
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
      const count = theme.mode === 'deepfield' ? 260 : theme.mode === 'nebula' ? 70 : 130;
      s.pts = Array.from({ length: count }, (_, i) => {
        if (theme.mode === 'spiral') {
          const arm = i % 3;
          const r = (i / count) * Math.max(W, H) * 0.55;
          const baseAngle = (i * 0.35) + (arm * (Math.PI * 2 / 3));
          return { r, baseAngle, size: 0.6 + Math.random() * 1.8, tw: Math.random() * Math.PI * 2 };
        }
        if (theme.mode === 'blackhole') {
          const r = 90 + Math.random() * Math.max(W, H) * 0.42;
          const angle = Math.random() * Math.PI * 2;
          return { r, angle, speed: (0.0025 + Math.random() * 0.004) * (r < 220 ? 2.2 : 1), size: 0.5 + Math.random() * 1.6 };
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
        const cx = W * 0.5, cy = H * 0.42;
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 210);
        grd.addColorStop(0, 'rgba(0,0,0,1)');
        grd.addColorStop(0.55, 'rgba(0,0,0,0.9)');
        grd.addColorStop(0.75, `rgba(${color},0.18)`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, 210, 0, Math.PI * 2);
        ctx.fill();
        s.pts.forEach((p) => {
          p.angle += p.speed;
          const x = cx + Math.cos(p.angle) * p.r;
          const y = cy + Math.sin(p.angle) * p.r * 0.5;
          const nearRim = p.r < 260 ? 1 : 0.4;
          ctx.beginPath();
          ctx.fillStyle = `rgba(${color},${0.2 + nearRim * 0.5})`;
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
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
  }, [themeId]);

  const theme = getTheme(themeId);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, background: theme.gradient }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  );
}
