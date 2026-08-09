// PULSE™ — Purpose, Motivation, Attitude, Ownership, Leadership & Values
// Assessment. Individual & leadership potential, target range Entry Level →
// Senior Manager. 90 items, 15 per dimension, 1-5 agreement scale.
//
// Item wording, dimension membership, reverse-keying and weighting are fixed by
// the published PULSE™ specification — do not edit any of it here. Items marked
// reverse: true are the (R) items and are flipped via 6 - response at scoring.

export const PULSE_DIMENSIONS = [
  { key: 'purpose', label: 'Purpose', weight: 0.15 },
  { key: 'motivation', label: 'Motivation', weight: 0.15 },
  { key: 'attitude', label: 'Attitude', weight: 0.15 },
  { key: 'ownership', label: 'Ownership', weight: 0.20 },
  { key: 'leadership', label: 'Leadership', weight: 0.20 },
  { key: 'values_alignment', label: 'Values Alignment', weight: 0.15 },
];

export const AGREEMENT_SCALE = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neither Agree nor Disagree' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];

export const PULSE_STEM =
  'Answer based on how you normally behave, not how you believe you are expected to behave. There are no right or wrong answers.';

// [text, reverse]
const RAW = {
  purpose: [
    ['I need to understand why my work matters before I can fully commit to it.', false],
    ['I feel motivated when my work creates value beyond my own success.', false],
    ['I can remain committed to meaningful work even when recognition is limited.', false],
    ['I actively look for ways my work can contribute to a larger goal.', false],
    ['I find it difficult to stay motivated when I cannot see the broader purpose of my work.', true],
    ['I care about the impact my decisions have on customers and colleagues.', false],
    ['I am willing to make short-term sacrifices for an important long-term purpose.', false],
    ['I want my career to stand for something meaningful.', false],
    ['I connect everyday tasks with the larger objectives of an organization.', false],
    ['I rarely think about the broader impact of the work I do.', true],
    ['I become more committed when I believe the goal is worthwhile.', false],
    ['I am willing to contribute even when the personal benefit is not immediate.', false],
    ['I look beyond my job description when pursuing an important organizational purpose.', false],
    ['I need external rewards to remain committed to difficult goals.', true],
    ['I want my work to leave a positive impact.', false],
  ],
  motivation: [
    ['I set challenging goals for myself without being asked.', false],
    ['I enjoy improving my performance even when nobody is evaluating me.', false],
    ['I actively seek opportunities to learn new skills.', false],
    ['I can maintain effort on difficult tasks for a long period.', false],
    ['I lose interest quickly when progress is slow.', true],
    ['I take initiative when I see an opportunity to improve something.', false],
    ['I am comfortable working without constant supervision.', false],
    ['I regularly think about how I can perform better.', false],
    ['I prefer waiting for instructions rather than deciding what needs to be done.', true],
    ['Achievement is an important source of personal satisfaction for me.', false],
    ['I continue working toward goals even after an initial setback.', false],
    ['I look for difficult assignments that stretch my abilities.', false],
    ['I need frequent encouragement from others to maintain momentum.', true],
    ['I take responsibility for maintaining my own development.', false],
    ['I am driven by progress, not just by external rewards.', false],
  ],
  attitude: [
    ['I remain constructive when circumstances do not go as planned.', false],
    ['I can accept criticism without becoming defensive.', false],
    ['I try to understand a problem before deciding who is responsible.', false],
    ['I adapt quickly when priorities change.', false],
    ['I become frustrated when others do not work according to my expectations.', true],
    ['I can remain positive during demanding periods.', false],
    ['I actively look for solutions when facing obstacles.', false],
    ['I am willing to change my opinion when new evidence emerges.', false],
    ['I treat setbacks as opportunities to learn.', false],
    ['I find unexpected change disruptive even when it is necessary.', true],
    ['I can disagree with someone while maintaining respect for them.', false],
    ['I remain professional when dealing with difficult people.', false],
    ['I ask for feedback even when I expect it may be uncomfortable.', false],
    ['When things go wrong, my first reaction is usually frustration.', true],
    ['I maintain a learning mindset when faced with unfamiliar situations.', false],
  ],
  ownership: [
    ['I take responsibility for outcomes, not just for completing my assigned tasks.', false],
    ['When I make a mistake, I acknowledge it quickly.', false],
    ['I proactively communicate problems before they become serious.', false],
    ['I follow through on commitments even when doing so becomes inconvenient.', false],
    ['When something goes wrong, I first look for external reasons.', true],
    ['I take action on important problems even when nobody has asked me to.', false],
    ['I keep others informed when my commitments may be delayed.', false],
    ['I do what I say I will do.', false],
    ['I am comfortable admitting when I do not know something.', false],
    ['I believe that problems outside my formal responsibility are usually not mine to solve.', true],
    ['I focus on finding a solution after acknowledging a mistake.', false],
    ['I take responsibility for the consequences of my decisions.', false],
    ['I raise difficult issues rather than hoping they resolve themselves.', false],
    ['I sometimes avoid taking ownership when responsibility is unclear.', true],
    ['People can rely on me to close the loop.', false],
  ],
  leadership: [
    ['I naturally help others perform at their best.', false],
    ['I listen carefully before making important decisions.', false],
    ['I can make difficult decisions when necessary.', false],
    ['I give people clear expectations and context.', false],
    ['I prefer controlling decisions rather than trusting others.', true],
    ['I give constructive feedback even when the conversation is uncomfortable.', false],
    ['I recognize the contributions of others.', false],
    ['I help resolve disagreements rather than avoiding them.', false],
    ['I adapt my leadership approach to different people.', false],
    ['I find it difficult to delegate important responsibilities.', true],
    ['I encourage people to challenge my ideas respectfully.', false],
    ['I take responsibility for the performance of people I lead.', false],
    ['I develop people rather than simply assigning them tasks.', false],
    ['I prioritize being liked over making difficult but necessary decisions.', true],
    ['I create clarity when people are uncertain about what to do.', false],
  ],
  values_alignment: [
    ['I make decisions based on principles even when doing so is personally inconvenient.', false],
    ['I treat people with respect regardless of their position.', false],
    ['I believe how results are achieved matters as much as the results themselves.', false],
    ['I speak up when I believe something is inconsistent with important principles.', false],
    ['I would compromise an important principle if doing so produced a significantly better result.', true],
    ['I treat colleagues consistently regardless of personal preference.', false],
    ['I value transparency when making important decisions.', false],
    ['I believe trust is earned through consistent behavior.', false],
    ['I respect people who challenge my assumptions.', false],
    ['Organizational values are less important when business pressure is high.', true],
    ['I consider the long-term consequences of decisions.', false],
    ['I behave consistently even when nobody is watching.', false],
    ['I believe leaders have a responsibility to model organizational values.', false],
    ['I am willing to protect my own interests even when doing so disadvantages the wider team.', true],
    ['I want to work in an organization whose values genuinely influence decisions.', false],
  ],
};

// Flattened in published order, so question ids stay stable (p1..p90) even
// though candidates always see them in a randomized order.
export const PULSE_QUESTIONS = PULSE_DIMENSIONS.flatMap((d, di) =>
  RAW[d.key].map(([text, reverse], i) => ({
    id: `p${di * 15 + i + 1}`,
    dimension: d.key,
    text,
    reverse,
  }))
);

export default PULSE_QUESTIONS;
