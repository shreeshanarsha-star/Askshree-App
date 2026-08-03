import { NextResponse } from 'next/server';
import { enforceGate } from '../../../../lib/enforceGate';
import { askClaude } from '../../../../lib/anthropic';

const TEMPLATES = ['classic', 'bold', 'minimal', 'photo-forward', 'stat-highlight', 'quote-led'];

const SYSTEM_PROMPT = `You are Welcome Flyer, part of Ask Shree's recruiting toolkit.
Given a new hire's name, role, and one welcoming detail about them, write a short,
warm welcome announcement (40-60 words) suitable for a company social post or
onboarding flyer. No hashtags, no emoji, sentence case, sound like a real person
wrote it, not corporate boilerplate.`;

export async function POST(req) {
  const { ip, response } = await enforceGate(req, 'welcome_flyer');
  if (response) return response;

  const { name, role, detail, template } = await req.json();
  if (!name || !role) {
    return NextResponse.json({ error: 'Provide at least name and role.' }, { status: 400 });
  }
  const chosenTemplate = TEMPLATES.includes(template) ? template : TEMPLATES[0];

  try {
    const copy = await askClaude(
      SYSTEM_PROMPT,
      `Name: ${name}\nRole: ${role}\nDetail: ${detail || 'none provided'}`,
      300
    );
    return NextResponse.json({ ip, result: { template: chosenTemplate, copy: copy.trim(), templates: TEMPLATES } });
  } catch (err) {
    return NextResponse.json({ error: 'Flyer copy generation failed. Try again.' }, { status: 500 });
  }
}
