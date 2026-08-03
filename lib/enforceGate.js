import { NextResponse } from 'next/server';
import { getClientIp, checkAndRecordUsage, logToolRun } from './gating';

// Wrap any tool route with this. Returns null if the request is allowed to
// proceed (and logs the tool run), or a NextResponse to return immediately
// if the caller has been locked out.
export async function enforceGate(req, toolName) {
  const ip = getClientIp(req);
  const result = await checkAndRecordUsage(ip);

  if (!result.allowed) {
    return {
      ip,
      response: NextResponse.json(
        { locked: true, message: result.message },
        { status: 402 }
      ),
    };
  }

  await logToolRun(ip, toolName);
  return { ip, response: null, status: result.status };
}
