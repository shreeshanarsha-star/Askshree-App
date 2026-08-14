import { supabaseAdmin } from './supabase';

// Projects are how a recruiter keeps candidates from Smart Source.ai /
// Smart Hunt.ai searches for later — tie to a real user_id if logged in,
// otherwise fall back to IP like every other anonymous-friendly table on
// this site. All access goes through supabaseAdmin (service role) from
// server-side routes only — RLS has no policies, so this is the only path in.

export async function ownerFilter({ userId, ip }) {
  return userId ? { column: 'user_id', value: userId } : { column: 'ip_address', value: ip };
}

export async function listProjects({ userId, ip }) {
  const db = supabaseAdmin();
  const owner = await ownerFilter({ userId, ip });
  const { data: projects } = await db
    .from('projects')
    .select('id, name, created_at')
    .eq(owner.column, owner.value)
    .order('created_at', { ascending: false });
  if (!projects || projects.length === 0) return [];

  const ids = projects.map((p) => p.id);
  const { data: counts } = await db
    .from('project_candidates')
    .select('project_id')
    .in('project_id', ids);
  const countMap = {};
  (counts || []).forEach((c) => { countMap[c.project_id] = (countMap[c.project_id] || 0) + 1; });

  return projects.map((p) => ({ ...p, candidate_count: countMap[p.id] || 0 }));
}

export async function createProject({ userId, ip, name }) {
  const db = supabaseAdmin();
  const row = { name: name.trim() };
  if (userId) row.user_id = userId; else row.ip_address = ip;
  const { data, error } = await db.from('projects').insert(row).select('id, name, created_at').single();
  if (error) throw error;
  return data;
}

export async function getProjectOwned({ projectId, userId, ip }) {
  const db = supabaseAdmin();
  const owner = await ownerFilter({ userId, ip });
  const { data } = await db
    .from('projects')
    .select('id, name, created_at')
    .eq('id', projectId)
    .eq(owner.column, owner.value)
    .maybeSingle();
  return data || null;
}

export async function addCandidatesToProject({ projectId, candidates }) {
  const db = supabaseAdmin();
  const rows = candidates.map((c) => ({
    project_id: projectId,
    name: c.name || null,
    designation: c.designation || null,
    company: c.company || null,
    location: c.location || null,
    match_score: c.match_score != null ? Math.round(c.match_score) : null,
    profile_url: c.profile_url || null,
    source: c.source || null,
    qualification: c.qualification || null,
    current_ctc: c.current_ctc || null,
    expected_ctc: c.expected_ctc || null,
    notice_period: c.notice_period || null,
  }));
  const { error } = await db.from('project_candidates').insert(rows);
  if (error) throw error;
}

export async function updateProjectCandidate({ projectId, candidateId, fields }) {
  const db = supabaseAdmin();
  const allowed = ['status', 'comments', 'qualification', 'current_ctc', 'expected_ctc', 'notice_period'];
  const update = {};
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key];
  }
  const { error } = await db.from('project_candidates').update(update).eq('project_id', projectId).eq('id', candidateId);
  if (error) throw error;
}

export async function getProjectCandidates(projectId) {
  const db = supabaseAdmin();
  const { data } = await db
    .from('project_candidates')
    .select('id, name, designation, company, location, match_score, profile_url, source, added_at, qualification, current_ctc, expected_ctc, notice_period, status, comments')
    .eq('project_id', projectId)
    .order('added_at', { ascending: false });
  return data || [];
}

export async function removeCandidateFromProject({ projectId, candidateId }) {
  const db = supabaseAdmin();
  await db.from('project_candidates').delete().eq('project_id', projectId).eq('id', candidateId);
}
