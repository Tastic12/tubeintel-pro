import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin';
import { getRequestUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getRequestUser();
  if (!user?.email) {
    return NextResponse.json({ isAdmin: false });
  }

  return NextResponse.json({ isAdmin: isAdminEmail(user.email) });
}
