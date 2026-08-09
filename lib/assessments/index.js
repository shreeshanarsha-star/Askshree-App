import { BIG_FIVE_QUESTIONS, BIG_FIVE_DIMENSIONS, BIG_FIVE_SCALE, BIG_FIVE_STEM } from './bigFive';
import { PULSE_QUESTIONS, PULSE_DIMENSIONS, AGREEMENT_SCALE, PULSE_STEM } from './pulse';
import { IMPACT_QUESTIONS, IMPACT_DIMENSIONS, IMPACT_STEM } from './impact';

export const ASSESSMENT_TYPES = ['big_five', 'pulse', 'impact'];

export const ASSESSMENTS = {
  big_five: {
    key: 'big_five',
    name: 'Big Five',
    fullName: 'IPIP Big-Five Factor Markers (50-item)',
    evaluative: false,
    questions: BIG_FIVE_QUESTIONS,
    dimensions: BIG_FIVE_DIMENSIONS,
    scale: BIG_FIVE_SCALE,
    stem: BIG_FIVE_STEM,
  },
  pulse: {
    key: 'pulse',
    name: 'PULSE™',
    fullName: 'PULSE™ — Individual & Leadership Potential Assessment',
    evaluative: true,
    questions: PULSE_QUESTIONS,
    dimensions: PULSE_DIMENSIONS,
    scale: AGREEMENT_SCALE,
    stem: PULSE_STEM,
  },
  impact: {
    key: 'impact',
    name: 'IMPACT™',
    fullName: 'IMPACT™ — Executive Leadership & Organizational Impact Assessment',
    evaluative: true,
    questions: IMPACT_QUESTIONS,
    dimensions: IMPACT_DIMENSIONS,
    scale: AGREEMENT_SCALE,
    stem: IMPACT_STEM,
  },
};

export function getAssessment(type) {
  return ASSESSMENTS[type] || null;
}

export { ROLE_LADDER, IMPACT_START_INDEX, autoAssessmentForRole } from './roles';
