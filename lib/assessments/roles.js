// The 18-step role ladder used by Assessment.ai. Order matters: the PULSE/IMPACT
// split point sits between 'Sr. Manager (14-18 yrs)' (last PULSE-eligible) and
// 'AGM (14-18 yrs)' (first IMPACT-eligible).
export const ROLE_LADDER = [
  'Fresher',
  'Jr. Executive (1 yr)',
  'Executive (2 yrs)',
  'Sr. Executive (3 yrs)',
  'Jr. Officer (4 yrs)',
  'Officer (6 yrs)',
  'Sr. Officer (7 yrs)',
  'Dy. Manager (8-10 yrs)',
  'Manager (10-14 yrs)',
  'Sr. Manager (14-18 yrs)',
  'AGM (14-18 yrs)',
  'GM (15-18 yrs)',
  'VP (15-20 yrs)',
  'Sr. VP (18-25 yrs)',
  'C-Suite',
  'CEO',
  'MD',
  'Chairman',
];

// First index that maps to IMPACT™ rather than PULSE™.
export const IMPACT_START_INDEX = ROLE_LADDER.indexOf('AGM (14-18 yrs)');

// Auto-assignment: Fresher…Sr. Manager -> PULSE, AGM…Chairman -> IMPACT.
// Big Five is deliberately NEVER auto-assigned — it's a trait profile, not a
// role-fit evaluation, so a recruiter has to choose it explicitly.
export function autoAssessmentForRole(roleLevel) {
  const idx = ROLE_LADDER.indexOf(roleLevel);
  if (idx === -1) return 'pulse'; // unknown/unparsed role falls back to PULSE
  return idx >= IMPACT_START_INDEX ? 'impact' : 'pulse';
}
