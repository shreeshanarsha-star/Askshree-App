import { NextResponse } from 'next/server';
import { getSessionAccount } from '../../../../lib/gauriAuth';

export async function GET(req) {
  const account = await getSessionAccount(req);
  return NextResponse.json({ account });
}
