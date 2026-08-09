// IMPACT™ — Executive Leadership & Organizational Impact Assessment.
// Target range General Manager → CXO / Executive. 90 items, 15 per dimension,
// same 1-5 agreement scale as PULSE™.
//
// Item wording, dimension membership, reverse-keying and weighting are fixed by
// the published IMPACT™ specification — do not edit any of it here.

export const IMPACT_DIMENSIONS = [
  { key: 'purpose_vision', label: 'Purpose & Vision', weight: 0.15 },
  { key: 'strategic_motivation', label: 'Strategic Motivation', weight: 0.15 },
  { key: 'executive_attitude', label: 'Executive Attitude', weight: 0.15 },
  { key: 'enterprise_ownership', label: 'Enterprise Ownership', weight: 0.20 },
  { key: 'leadership_impact', label: 'Leadership Impact', weight: 0.20 },
  { key: 'values_integrity', label: 'Values & Integrity', weight: 0.15 },
];

export const IMPACT_STEM =
  'Answer based on how you normally behave as a leader, not how you believe you are expected to behave. There are no right or wrong answers.';

// [text, reverse]
const RAW = {
  purpose_vision: [
    ['I naturally think about what an organization should become several years from now.', false],
    ['I can translate a broad purpose into clear strategic priorities.', false],
    ['I am motivated by building something that lasts beyond my own tenure.', false],
    ['I communicate a compelling reason for change.', false],
    ['I tend to focus more on immediate targets than long-term organizational direction.', true],
    ['I connect business decisions with their wider organizational consequences.', false],
    ["I challenge existing assumptions when they no longer serve the organization's purpose.", false],
    ['I can maintain strategic direction during periods of uncertainty.', false],
    ['I invest time in defining what success should look like before pursuing it.', false],
    ['I find it difficult to balance quarterly performance with long-term value creation.', true],
    ['I want the organization to have a meaningful identity beyond financial performance.', false],
    ['I create clarity when the future direction is uncertain.', false],
    ['I can align diverse stakeholders around a common purpose.', false],
    ["I rarely revisit the assumptions behind the organization's long-term direction.", true],
    ['I measure my leadership partly by what the organization becomes after I leave.', false],
  ],
  strategic_motivation: [
    ['I am energized by solving complex organizational problems.', false],
    ['I seek opportunities to create significant rather than incremental impact.', false],
    ['I enjoy building systems that can scale without depending on me.', false],
    ['I am motivated by developing leaders who can outperform me in their areas.', false],
    ['Personal status is a primary measure of career success for me.', true],
    ['I willingly take on difficult problems that others avoid.', false],
    ['I continuously look for opportunities to improve organizational performance.', false],
    ['I remain motivated when strategic results take years to materialize.', false],
    ['I am comfortable making decisions where there is no perfect answer.', false],
    ['I prefer predictable environments over opportunities with significant growth potential.', true],
    ['I actively develop my understanding of markets and external forces.', false],
    ['I am motivated by creating sustainable organizational value.', false],
    ['I maintain ambition even when current performance is already strong.', false],
    ['I need visible personal recognition to remain highly engaged.', true],
    ['I am driven by the opportunity to build organizational capability.', false],
  ],
  executive_attitude: [
    ['I remain composed when important decisions produce unexpected consequences.', false],
    ['I actively seek perspectives that challenge my thinking.', false],
    ['I can change direction without becoming attached to my previous decision.', false],
    ['I can remain optimistic without ignoring serious risks.', false],
    ['I become defensive when senior colleagues challenge my decisions.', true],
    ['I distinguish between criticism of an idea and criticism of myself.', false],
    ['I acknowledge uncertainty when the available information is incomplete.', false],
    ['I encourage people to tell me uncomfortable truths.', false],
    ['I treat major setbacks as opportunities to improve the system.', false],
    ['I tend to protect my reputation when something goes wrong.', true],
    ['I remain curious even when I have substantial experience in a subject.', false],
    ['I can make calm decisions under significant pressure.', false],
    ['I actively examine my own leadership weaknesses.', false],
    ['Once I have committed publicly to a position, I find it difficult to reconsider it.', true],
    ['I believe intellectual humility is an executive strength.', false],
  ],
  enterprise_ownership: [
    ['I take responsibility for organizational outcomes beyond my formal function.', false],
    ['I make decisions based on enterprise value rather than departmental interests.', false],
    ['I openly acknowledge when my strategic assumptions were wrong.', false],
    ['I address systemic problems rather than repeatedly solving their symptoms.', false],
    ["I protect my function's interests even when doing so harms the wider organization.", true],
    ['I proactively address risks before they become visible crises.', false],
    ['I accept responsibility when outcomes fall short of expectations.', false],
    ['I ensure accountability is clear across the organization.', false],
    ['I do not use organizational complexity as an excuse for inaction.', false],
    ['When another function fails, I consider what I could have done differently.', false],
    ["I make difficult trade-offs when the organization's interests require them.", false],
    ['I personally own difficult decisions even when they are unpopular.', false],
    ['I create mechanisms that prevent recurring problems.', false],
    ['I believe accountability should primarily sit with whoever directly made the mistake.', true],
    ['I take responsibility for the consequences of the culture I create.', false],
  ],
  leadership_impact: [
    ['My goal is to build leaders, not followers.', false],
    ['I create environments where strong people can challenge me.', false],
    ['I hold senior leaders accountable for both results and behavior.', false],
    ['I delegate authority along with responsibility.', false],
    ['I prefer being the final decision-maker on most important matters.', true],
    ['I actively identify and develop future successors.', false],
    ['I create clarity across multiple teams and functions.', false],
    ['I address high-performance/high-behavior-risk individuals rather than tolerating them indefinitely.', false],
    ['I adapt my leadership style as the organization grows.', false],
    ['I find it difficult to let capable leaders make decisions without my involvement.', true],
    ['I communicate difficult decisions with transparency and respect.', false],
    ['I build systems that allow performance to continue without my direct involvement.', false],
    ['I measure my leadership partly by the quality of leaders I develop.', false],
    ['I believe strong leaders should maintain tight control over critical decisions.', true],
    ['I actively shape organizational culture through my own behavior.', false],
  ],
  values_integrity: [
    ['I protect important organizational principles even when doing so has a financial cost.', false],
    ['I expect senior leaders to be held to the same standards as everyone else.', false],
    ['I would disclose material information even when disclosure could damage my reputation.', false],
    ['I consider ethical consequences before making major strategic decisions.', false],
    ['Exceptional performers should sometimes be exempt from organizational values.', true],
    ['I act consistently whether a decision is visible to others or not.', false],
    ['I challenge unethical behavior even when the person involved is powerful.', false],
    ['I believe trust is a strategic organizational asset.', false],
    ["I consider how today's decisions affect the organization's reputation years from now.", false],
    ['Meeting aggressive targets can justify bending certain organizational principles.', true],
    ['I take responsibility for the ethical climate created by my leadership.', false],
    ['I encourage transparency about failures and risks.', false],
    ['I make decisions I can defend publicly and privately.', false],
    ['I would protect a high-performing executive from consequences if losing them would hurt the business.', true],
    ['I believe values should influence difficult decisions, not just company communications.', false],
  ],
};

export const IMPACT_QUESTIONS = IMPACT_DIMENSIONS.flatMap((d, di) =>
  RAW[d.key].map(([text, reverse], i) => ({
    id: `i${di * 15 + i + 1}`,
    dimension: d.key,
    text,
    reverse,
  }))
);

export default IMPACT_QUESTIONS;
