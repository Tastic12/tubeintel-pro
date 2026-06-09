import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/request-auth';
import { getSubscriptionStatusForUser } from '@/lib/subscription-status-server';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const requestUser = await getRequestUser();

    if (!requestUser) {
      return NextResponse.json({
        subscribed: false,
        plan: 'free',
        subscription: null,
        message: 'User not authenticated',
      });
    }

    const payload = await getSubscriptionStatusForUser(requestUser.id);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check subscription status';
    return NextResponse.json(
      {
        subscribed: false,
        plan: 'free',
        subscription: null,
        error: message,
      },
      { status: 500 }
    );
  }
}
