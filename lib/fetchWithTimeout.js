// Every external SignalHire call in this app goes through this instead of
// bare fetch(). Root cause of a real incident: enrichTopCandidates() and the
// reveal-contact routes called SignalHire with no timeout at all. If
// SignalHire's endpoint hangs instead of returning a fast error (which is
// exactly what happens with a suspended/rate-limited key on some providers),
// an un-timed-out fetch can block the whole request until Vercel's function
// timeout kills it -- turning "SignalHire enrichment failed" into "the
// entire search failed," since the enrichment call sits in the middle of
// the search route, not off to the side.
//
// This wraps fetch with an AbortController so a stuck SignalHire call always
// gives up after `timeoutMs` and lets the caller's existing try/catch
// degrade gracefully (empty Map / not_found), instead of stalling.
export async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
