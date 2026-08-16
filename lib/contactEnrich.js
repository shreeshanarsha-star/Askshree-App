// Contact reveal for Smart Source.ai / Smart Hunt.ai results.
//
// Providers, in priority order: SignalHire (primary, paid account connected),
// Apollo.io (secondary/fallback if ever configured). Hunter.io key is still
// accepted in the "is anything configured" check for the not-configured
// message, but has no implementation — not currently used.
//
// Degrades gracefully like lib/email.js: instead of hiding the feature or
// failing hard, it tells the recruiter plainly when enrichment isn't
// configured or a candidate genuinely has no public contact on file.
import { fetchWithTimeout } from './fetchWithTimeout';

const SIGNALHIRE_SEARCH_URL = 'https://www.signalhire.com/api/v1/candidate/search';

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

  if (signalHireKey && profileUrl) {
    try {
      const res = await fetchWithTimeout(SIGNALHIRE_SEARCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: signalHireKey },
        body: JSON.stringify({ items: [profileUrl], withoutWaterfall: true }),
      });
      if (res.ok) {
        const data = await res.json();
        const result = Array.isArray(data) ? data[0] : null;
        const candidate = result?.status === 'success' ? result.candidate : null;
        const contacts = candidate?.contacts || [];
        const email = contacts.find((c) => c.type === 'email');
        const phone = contacts.find((c) => c.type === 'phone');
        if (email || phone) {
          return {
            ok: true,
            email: email?.value || null,
            phone: phone?.value || null,
            emailConfidence: email?.rating || null,
            phoneConfidence: phone?.rating || null,
            provider: 'signalhire',
          };
        }
        // status was success/failed but no contacts on file — fall through
        // to Apollo (if configured) rather than giving up immediately.
      } else if (res.status === 402) {
        return {
          ok: false,
          reason: 'signalhire_credits_exhausted',
          message: 'SignalHire credits are exhausted for this account. Contact reveal will resume once credits are topped up.',
        };
      }
    } catch (e) {
      // fall through to Apollo / not-found below
    }
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


// Batched version for the "Reveal contact (N)" bulk action -- one SignalHire
// request for up to 100 candidates instead of N sequential calls. Falls back
// to per-candidate revealContact() (which itself handles the Apollo path and
// the not-configured message) when SignalHire isn't the active provider, so
// behavior is unchanged if only Apollo/Hunter is configured.
export async function revealContactsBatch(items) {
  const signalHireKey = process.env.SIGNALHIRE_API_KEY;
  const results = new Map();
  const withUrl = items.filter((it) => it.profileUrl);

  if (signalHireKey && withUrl.length) {
    try {
      const res = await fetchWithTimeout(SIGNALHIRE_SEARCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: signalHireKey },
        body: JSON.stringify({ items: withUrl.slice(0, 100).map((it) => it.profileUrl), withoutWaterfall: true }),
      });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        for (const r of arr) {
          const contacts = r.status === 'success' ? (r.candidate?.contacts || []) : [];
          const email = contacts.find((c) => c.type === 'email');
          const phone = contacts.find((c) => c.type === 'phone');
          results.set(r.item, (email || phone)
            ? { ok: true, email: email?.value || null, phone: phone?.value || null, provider: 'signalhire' }
            : { ok: false, reason: 'not_found', message: 'No public contact details found for this candidate.' });
        }
      } else if (res.status === 402) {
        for (const it of withUrl) {
          results.set(it.profileUrl, { ok: false, reason: 'signalhire_credits_exhausted', message: 'SignalHire credits are exhausted for this account.' });
        }
        return results;
      }
    } catch (e) {
      // fall through to per-item below for anything not already resolved
    }
  }

  // Anything not resolved by the batch call (no key, no profileUrl, or a
  // transport error) falls back to the single-item path per candidate.
  for (const it of items) {
    const key = it.profileUrl || it.name;
    if (results.has(it.profileUrl)) continue;
    const single = await revealContact(it);
    results.set(key, single);
  }
  return results;
}
