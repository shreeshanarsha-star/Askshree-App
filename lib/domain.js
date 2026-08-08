// Shared domain-extraction helper — used to compare a poster's confirmed email
// domain against their stated company URL (email verification "domain match" flag).
export function getDomain(str) {
  if (!str) return '';
  let s = str.trim().toLowerCase();
  if (s.includes('@')) s = s.split('@')[1];
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '');
  s = s.split('/')[0];
  return s;
}
