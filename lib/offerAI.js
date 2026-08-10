import { askClaude, askClaudeWithSearch } from './anthropic';

// Standard pay-component labels we know how to categorise for the Gross
// Salary / Total CTC subtotal split. Anything AI finds that isn't on this
// list still gets kept — it's just bucketed as an "earning" by default
// unless it clearly reads as an employer contribution (PF, gratuity, etc.).
const EMPLOYER_CONTRIBUTION_HINTS = ['employer pf', 'provident fund', 'gratuity', 'employer contribution', 'nps'];

function categorise(label) {
  const l = (label || '').toLowerCase();
  return EMPLOYER_CONTRIBUTION_HINTS.some((h) => l.includes(h)) ? 'employer_contribution' : 'earning';
}

// Reads everything the recruiter uploaded (CV, appointment letter, payslips,
// JD, budget approval) and extracts one structured picture of the candidate.
// Same discipline as assessmentAI.js's extractCandidateFields: strict JSON,
// never invent a figure or a field that isn't actually in the documents —
// missing things come back null and the recruiter fills them in manually.
const EXTRACT_PROMPT = `You extract candidate and compensation details from a set of recruiting
documents (CV, previous appointment letter, payslip(s), job description, budget approval note) for
an offer-proposal tool. You are given the raw text of each document, labelled by type. Respond as
JSON only (no markdown fences, no prose):
{
  "candidate_name": string or null,
  "email": string or null,
  "current_designation": string or null (from the appointment letter or payslip, not the CV's objective line),
  "proposed_designation": string or null (the role title from the job description, if present),
  "grade": string or null (band/grade if stated anywhere),
  "division": string or null,
  "department": string or null,
  "notice_period": string or null (from the appointment letter, e.g. "60 days"),
  "role_title": string or null (job description's role title),
  "budget_band": string or null (approved compensation range for this role, from the budget document, as written — do not convert or reformat it),
  "currency": string (ISO 4217 code the payslip figures are actually denominated in — INR unless the payslip clearly states otherwise, e.g. USD, EUR, GBP, AED, SGD),
  "components": array of objects, one per distinct pay component found on the payslip(s):
    { "label": string (e.g. "Basic Salary", "HRA"), "monthly": number, "annual": number or null }
    Use the most recent payslip if more than one is given. Only include components actually present
    in the payslip text — never invent standard components (HRA, LTA, etc.) that aren't there.
}
Never invent a name, email, figure, or date that is not present in the given text — use null instead.
Numbers must be plain numbers (no currency symbols, no commas).`;

export async function extractOfferDocuments(docTexts) {
  // docTexts: { cv, appointmentLetter, payslip, jd, budget } — any may be empty.
  const sections = Object.entries(docTexts)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `--- ${k.toUpperCase()} ---\n${v.slice(0, 15000)}`)
    .join('\n\n');

  const raw = await askClaude(EXTRACT_PROMPT, sections, 1800);
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

  parsed.currency = parsed.currency || 'INR';
  parsed.components = (parsed.components || []).map((c) => ({
    label: c.label,
    current_monthly: c.monthly ?? null,
    current_annual: c.annual ?? (c.monthly != null ? Math.round(c.monthly * 12) : null),
    category: categorise(c.label),
  }));
  return parsed;
}

// Pure calculation — applies the recruiter's chosen hike % uniformly across
// every "auto" component to get the proposed figures, then recomputes the
// Gross Salary and Total CTC subtotals. Components flagged mode:'manual' are
// left exactly as the recruiter set them (their own edit wins over the hike
// math) — this is what lets a recruiter fix or add a component (joining
// bonus, ESOP, relocation) without the next recalculation stomping on it.
// No AI call: deterministic, so the UI can recalculate instantly.
export function computeProposedComponents(components, hikePercent) {
  const factor = 1 + (Number(hikePercent) || 0) / 100;
  const withProposed = components.map((c) => {
    if (c.mode === 'manual') {
      const proposedMonthly = c.proposed_monthly ?? null;
      const proposedAnnual = proposedMonthly != null ? proposedMonthly * 12 : (c.proposed_annual ?? null);
      return { ...c, proposed_monthly: proposedMonthly, proposed_annual: proposedAnnual };
    }
    const proposedMonthly = c.current_monthly != null ? Math.round(c.current_monthly * factor) : null;
    const proposedAnnual = proposedMonthly != null ? proposedMonthly * 12 : null;
    return { ...c, mode: 'auto', proposed_monthly: proposedMonthly, proposed_annual: proposedAnnual };
  });

  const sum = (rows, field) => rows.reduce((s, r) => s + (r[field] || 0), 0);
  const earnings = withProposed.filter((c) => c.category !== 'employer_contribution');
  const employerContribs = withProposed.filter((c) => c.category === 'employer_contribution');

  return {
    components: withProposed,
    gross_current: sum(earnings, 'current_monthly') * 12,
    gross_proposed: sum(earnings, 'proposed_monthly') * 12,
    total_ctc_current: (sum(earnings, 'current_monthly') + sum(employerContribs, 'current_monthly')) * 12,
    total_ctc_proposed: (sum(earnings, 'proposed_monthly') + sum(employerContribs, 'proposed_monthly')) * 12,
  };
}

// The chat-style step before the justification is finalised: AI does live
// market-salary research for the role, weighs current vs. proposed comp and
// the approved budget band, and either asks the recruiter one clarifying
// question (e.g. "what did the candidate quote as their expected CTC?") or,
// once it has enough to work with, drafts the justification.
const CHAT_SYSTEM_PROMPT = `You are helping a recruiter justify a compensation proposal before it
goes to an approver. You have web search available — use it to find current market compensation
data for the role, seniority and location described. You are given the candidate's current
compensation, the proposed compensation, the approved budget band (if known), the role, and the
conversation so far with the recruiter.

Decide whether you have enough to write a solid, specific justification (grounded in the actual
numbers, the market data you found, and anything the recruiter has told you — e.g. the candidate's
expected CTC, location, or reason for the hike). If something material and not guessable is
missing (most commonly: the candidate's expected/quoted compensation, or their exact location if it
affects market comp), ask ONE short, concrete question for it. Otherwise, write the justification.

Respond as JSON only (no markdown fences, no prose outside the JSON):
{ "type": "question", "text": string }
or
{ "type": "justification", "text": string }

The justification, when you write it, must be 3-5 sentences, reference the actual current and
proposed figures, cite the market data you found (role/level/location, in general terms — you don't
need to name specific sources inline), note the budget band if given, and explain the reasoning
in plain, defensible language a hiring manager or finance approver would accept. Never fabricate a
market figure — if search doesn't return anything useful, say the proposal is benchmarked against
internal budget and comparable recent hires instead.`;

export async function offerChatReply({ context, history }) {
  const historyText = (history || [])
    .map((m) => `${m.role === 'recruiter' ? 'RECRUITER' : 'AI'}: ${m.text}`)
    .join('\n');
  const userMessage = `${context}\n\n--- CONVERSATION SO FAR ---\n${historyText || '(nothing yet — this is the first turn)'}`;
  const raw = await askClaudeWithSearch(CHAT_SYSTEM_PROMPT, userMessage, 1200);
  // The model may still wrap JSON in prose despite instructions when search
  // results are noisy — pull out the first {...} block defensively.
  const match = raw.match(/\{[\s\S]*\}/);
  const jsonText = match ? match[0] : raw;
  try {
    return JSON.parse(jsonText.replace(/```json|```/g, '').trim());
  } catch {
    return { type: 'justification', text: raw.replace(/```json|```/g, '').trim() };
  }
}
