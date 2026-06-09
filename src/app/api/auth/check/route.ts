import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const requestUser = await getRequestUser();

    if (!requestUser) {
      return NextResponse.json(
        {
          authenticated: false,
          message: 'User not authenticated',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: requestUser.id,
        email: requestUser.email,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check authentication status';
    return NextResponse.json(
      {
        authenticated: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
