// Contact reveal for Smart Source.ai / Smart Hunt.ai results — was always
// part of the finalized plan (per the "no contact-reveal yet" note that
// already shipped in the search code) but needs a paid enrichment provider
// (Apollo.io, Hunter.io, or SignalHire) that isn't connected yet.
//
// Degrades gracefully like lib/email.js: instead of hiding the feature or
// failing hard, it tells the recruiter plainly that enrichment isn't
// configured. Once an APOLLO_API_KEY (or HUNTER_API_KEY / SIGNALHIRE_API_KEY)
// env var is added, real lookups switch on here with no UI change needed.
export async function revealContact({ name, company, profileUrl }) {
  const apolloKey = process.env.APOLLO_API_KEY;
  const hunterKey = process.env.HUNTER_API_KEY;
  const signalHireKey = process.env.SIGNALHIRE_API_KEY;

  if (!apolloKey && !hunterKey && !signalHireKey) {
    return {
      ok: false,
      reason: 'no_enrichment_configured',
      message: 'Contact enrichment isn’t connected yet — ask the site owner to add an Apollo, Hunter, or SignalHire API key.',
    };
  }

  if (apolloKey) {
    try {
      const res = await fetch('https://api.apollo.io/v1/people/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': apolloKey },
        body: JSON.stringify({ name, organization_name: company, linkedin_url: profileUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        const person = data?.person;
        if (person && (person.email || person.phone_numbers?.length)) {
          return {
            ok: true,
            email: person.email || null,
            phone: person.phone_numbers?.[0]?.sanitized_number || null,
            provider: 'apollo',
          };
        }
      }
    } catch (e) {
      // fall through to not-found below
    }
  }

  return { ok: false, reason: 'not_found', message: 'No public contact details found for this candidate.' };
}
