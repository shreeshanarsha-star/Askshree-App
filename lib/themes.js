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
