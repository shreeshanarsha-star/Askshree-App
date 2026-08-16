// The 6 site themes. Each is a purely CSS/canvas-driven background mood —
// no external image assets (the build sandbox can't reach any image CDN,
// including Adobe's own, so photographic art isn't an option here). Each
// theme pairs a canvas particle mode (see components/ThemeBackground.js)
// with a CSS gradient backdrop and a glow/particle color used only by the
// background itself -- the site's amber brand accent stays constant
// everywhere else so buttons/links/badges don't shift per theme.
export const THEMES = [
  {
    id: 'cosmic-spiral',
    label: 'Cosmic Spiral',
    mode: 'spiral',
    particleColor: '108,212,255',
    glow: '#1a3a5c',
    gradient: 'radial-gradient(ellipse at 50% 40%, #142a45 0%, #0a1220 55%, #05070c 100%)',
  },
  {
    id: 'black-hole',
    label: 'Black Hole',
    mode: 'blackhole',
    particleColor: '200,225,255',
    glow: '#0d1b2e',
    gradient: 'radial-gradient(circle at 50% 45%, #000000 0%, #050810 30%, #0a1420 60%, #060a12 100%)',
  },
  {
    id: 'purple-nebula',
    label: 'Purple Nebula',
    mode: 'nebula',
    particleColor: '200,160,255',
    glow: '#2a1548',
    gradient: 'radial-gradient(ellipse at 30% 30%, #2a1548 0%, transparent 55%), radial-gradient(ellipse at 75% 65%, #3a1450 0%, transparent 50%), #06060c',
  },
  {
    id: 'stellar-network',
    label: 'Stellar Network',
    mode: 'network',
    particleColor: '123,224,192',
    glow: '#0e2a24',
    gradient: 'radial-gradient(ellipse at 50% 35%, #0c1e1c 0%, #070d10 60%, #05070a 100%)',
  },
  {
    id: 'sunrise-horizon',
    label: 'Sunrise Horizon',
    mode: 'sunrise',
    particleColor: '255,200,140',
    glow: '#3a2410',
    gradient: 'linear-gradient(180deg, #060a14 0%, #0a1220 40%, #2a1a10 78%, #4a2810 100%)',
  },
  {
    id: 'arc-reactor-mark-1',
    label: 'Arc Reactor \u2014 Mark I',
    mode: 'network',
    particleColor: '58,139,255',
    glow: '#0d2247',
    gradient: 'radial-gradient(ellipse at 50% 38%, #10254a 0%, #081426 55%, #05070c 100%)',
  },
  {
    id: 'arc-reactor-mark-2',
    label: 'Arc Reactor \u2014 Mark II',
    mode: 'spiral',
    particleColor: '224,168,60',
    glow: '#3a2a0c',
    gradient: 'radial-gradient(ellipse at 50% 40%, #3a2a0c 0%, #1c1408 55%, #08060c 100%)',
  },
  {
    id: 'arc-reactor-mark-3',
    label: 'Arc Reactor \u2014 Mark III',
    mode: 'deepfield',
    particleColor: '47,214,184',
    glow: '#0a2a24',
    gradient: 'radial-gradient(ellipse at 50% 50%, #0a2420 0%, #061613 60%, #040908 100%)',
  },
  {
    id: 'arc-reactor-mark-4',
    label: 'Arc Reactor \u2014 Mark IV',
    mode: 'blackhole',
    particleColor: '255,75,75',
    glow: '#3a0d0d',
    gradient: 'radial-gradient(circle at 50% 45%, #1a0505 0%, #0d0608 35%, #08050a 65%, #050308 100%)',
  },
  {
    id: 'deep-field',
    label: 'Deep Field',
    mode: 'deepfield',
    particleColor: '220,230,255',
    glow: '#0a0e18',
    gradient: 'radial-gradient(ellipse at 50% 50%, #0a0e18 0%, #050609 70%, #020304 100%)',
  },
];

export const DEFAULT_THEME = 'stellar-network';

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || THEMES.find((t) => t.id === DEFAULT_THEME);
}

// Blend an "r,g,b" triplet toward the navy page background by `factor`
// (0 = no change, 1 = fully navy) -- used to derive a legible "dim" accent
// variant per theme without hand-picking a second color for each one.
const NAVY_RGB = [11, 15, 26];
function mixTowardNavy(rgbStr, factor) {
  const [r, g, b] = rgbStr.split(',').map(Number);
  const mr = Math.round(r + (NAVY_RGB[0] - r) * factor);
  const mg = Math.round(g + (NAVY_RGB[1] - g) * factor);
  const mb = Math.round(b + (NAVY_RGB[2] - b) * factor);
  return `${mr},${mg},${mb}`;
}

// The site's brand accent (buttons, links, active nav item, badges) used to
// stay fixed amber on every page regardless of theme. Now, on the pages that
// actually render the animated background (Home, About, Contact, Credits),
// the accent instead follows that background's own particle color -- so the
// UI reads as one cohesive palette with whatever mood is currently showing,
// rather than a fixed orange/gold sitting on top of a differently-colored
// scene. Returns a style object to spread onto the page's outer wrapper;
// every other page keeps the global default defined in :root.
export function getThemeAccentStyle(themeId) {
  const theme = getTheme(themeId);
  const rgb = theme.particleColor;
  return {
    '--amber': `rgb(${rgb})`,
    '--amber-dim': `rgb(${mixTowardNavy(rgb, 0.42)})`,
    '--amber-rgb': rgb,
  };
}
