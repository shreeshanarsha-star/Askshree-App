import { getAssessment } from './assessments';

// ---------------------------------------------------------------------------
// Shared scoring engine for Assessment.ai.
//
// Mechanics are identical across all three instruments:
//   reverse-keyed items are flipped via (6 - response), each dimension score is
//   the mean of its items' post-reverse responses x 20, giving 0-100.
//
// What differs is INTERPRETATION:
//   - PULSE / IMPACT are evaluative: dimensions are weighted into a single
//     overall score and mapped onto hiring-oriented bands.
//   - Big Five is a TRAIT PROFILE: no weighting, no overall score, and neutral
//     band labels. Never render it with hire-strength language.
// ---------------------------------------------------------------------------

// Evaluative bands, per-dimension and overall (PULSE).
const PULSE_BANDS = [
  { min: 85, label: 'Exceptional' },
  { min: 75, label: 'Strong' },
  { min: 65, label: 'Moderate-Strong' },
  { min: 50, label: 'Development Area' },
  { min: 0, label: 'Significant Concern' },
];

// Evaluative bands, per-dimension and overall (IMPACT).
const IMPACT_BANDS = [
  { min: 90, label: 'Exceptional Executive Profile' },
  { min: 80, label: 'Strong Executive Profile' },
  { min: 70, label: 'Solid / Review' },
  { min: 60, label: 'Development Required' },
  { min: 0, label: 'Significant Executive Risk' },
];

// Neutral trait bands — Big Five only. Deliberately descriptive, never evaluative.
const BIG_FIVE_BANDS = [
  { min: 90, label: 'High' },
  { min: 75, label: 'Above Average' },
  { min: 60, label: 'Average' },
  { min: 40, label: 'Below Average' },
  { min: 0, label: 'Low' },
];

const BAND_TABLES = { pulse: PULSE_BANDS, impact: IMPACT_BANDS, big_five: BIG_FIVE_BANDS };

export function bandFor(type, score) {
  const table = BAND_TABLES[type] || PULSE_BANDS;
  const hit = table.find((b) => score >= b.min);
  return hit ? hit.label : table[table.length - 1].label;
}

// PULSE's overall band table is the per-dimension table, with anything at or
// above 75 additionally flagged as strong hire potential.
export function overallBandFor(type, score) {
  const base = bandFor(type, score);
  if (type === 'pulse' && score >= 75) return `${base} — Strong Hire Potential`;
  return base;
}

function clampResponse(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n < 1 || n > 5) return null;
  return Math.round(n);
}

/**
 * Scores a completed assessment.
 * @param {string} type            'big_five' | 'pulse' | 'impact'
 * @param {Object} responses       map of questionId -> 1..5
 * @returns {{ dimensionScores, overallScore, bandLabel, answeredCount, totalQuestions }}
 *          overallScore/bandLabel are null for Big Five (trait profile, no overall).
 */
export function scoreAssessment(type, responses) {
  const spec = getAssessment(type);
  if (!spec) throw new Error(`Unknown assessment type: ${type}`);

  const buckets = {};
  for (const d of spec.dimensions) buckets[d.key] = [];

  let answeredCount = 0;
  for (const q of spec.questions) {
    const raw = clampResponse(responses?.[q.id]);
    if (raw === null) continue;
    answeredCount++;
    buckets[q.dimension].push(q.reverse ? 6 - raw : raw);
  }

  const dimensionScores = spec.dimensions.map((d) => {
    const vals = buckets[d.key];
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const score = Math.round(mean * 20 * 10) / 10; // 0-100, one decimal
    return {
      key: d.key,
      label: d.label,
      weight: d.weight ?? null,
      score,
      band: bandFor(type, score),
      answered: vals.length,
    };
  });

  // Big Five is a profile — no weighted overall, no evaluative summary label.
  if (!spec.evaluative) {
    return {
      dimensionScores,
      overallScore: null,
      bandLabel: null,
      answeredCount,
      totalQuestions: spec.questions.length,
    };
  }

  const totalWeight = dimensionScores.reduce((a, d) => a + (d.weight || 0), 0) || 1;
  const weighted = dimensionScores.reduce((a, d) => a + d.score * (d.weight || 0), 0) / totalWeight;
  const overallScore = Math.round(weighted * 10) / 10;

  return {
    dimensionScores,
    overallScore,
    bandLabel: overallBandFor(type, overallScore),
    answeredCount,
    totalQuestions: spec.questions.length,
  };
}

// Deterministic shuffle driven by a stored seed, so a candidate's question order
// is randomized per assignment but stable across refreshes. (mulberry32 PRNG.)
export function seededShuffle(items, seed) {
  let a = seed >>> 0;
  const rand = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The candidate-facing question list: text + id only, in this assignment's
// stable randomized order. Never leaks `reverse` or `dimension` — a candidate
// who can see the keying can game the instrument.
export function questionsForAssignment(type, seed) {
  const spec = getAssessment(type);
  if (!spec) return [];
  return seededShuffle(
    spec.questions.map((q) => ({ id: q.id, text: q.text })),
    seed
  );
}
