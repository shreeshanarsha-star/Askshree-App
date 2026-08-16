// Builds Google-for-Jobs-compliant JobPosting JSON-LD from a job_postings
// row. Deliberately conservative: only emits fields we have confident,
// correctly-typed data for. Google rejects an entire JobPosting if a typed
// field (like baseSalary) is malformed, so unstructured free-text fields
// (ctc_budget) are left out of the structured data rather than guessed at --
// the page still shows ctc_budget to human readers, just not to Google.
//
// Required by Google: title, description, datePosted, hiringOrganization,
// jobLocation (or remote flag). All present below whenever a posting has
// gone through admin approval.
export function buildJobPostingSchema(posting, pageUrl) {
  const mustHave = posting.must_have_skills || [];
  const goodToHave = posting.good_to_have_skills || [];

  const descParts = [];
  if (posting.qualification) descParts.push(`<p>Qualification: ${escapeHtml(posting.qualification)}</p>`);
  if (mustHave.length) descParts.push(`<p>Must-have skills: ${escapeHtml(mustHave.join(', '))}</p>`);
  if (goodToHave.length) descParts.push(`<p>Good to have: ${escapeHtml(goodToHave.join(', '))}</p>`);
  if (posting.industry) descParts.push(`<p>Industry: ${escapeHtml(posting.industry)}</p>`);
  if (posting.ctc_budget) descParts.push(`<p>Compensation: ${escapeHtml(posting.ctc_budget)}</p>`);
  const description = descParts.join('') || `<p>${escapeHtml(posting.title)} at ${escapeHtml(posting.company || '')}.</p>`;

  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: posting.title,
    description,
    identifier: {
      '@type': 'PropertyValue',
      name: 'Ask Shree',
      value: posting.id,
    },
    datePosted: posting.created_at,
    hiringOrganization: {
      '@type': 'Organization',
      name: posting.company || 'Confidential',
      ...(posting.company_url ? { sameAs: posting.company_url } : {}),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: posting.location || undefined,
        addressCountry: 'IN',
      },
    },
    url: pageUrl,
  };

  if (posting.expires_at) schema.validThrough = posting.expires_at;
  if (posting.qualification) schema.educationRequirements = posting.qualification;
  if (posting.min_years_experience != null) {
    schema.experienceRequirements = {
      '@type': 'OccupationalExperienceRequirements',
      monthsOfExperience: Math.round(posting.min_years_experience * 12),
    };
  }
  if (mustHave.length || goodToHave.length) {
    schema.skills = [...mustHave, ...goodToHave].join(', ');
  }

  return schema;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
