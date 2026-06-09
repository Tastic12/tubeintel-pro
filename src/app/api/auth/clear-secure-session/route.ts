import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth-cookies';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    console.error('Error clearing secure session:', error);
    return NextResponse.json({ error: 'Failed to clear secure session' }, { status: 500 });
  }
}
