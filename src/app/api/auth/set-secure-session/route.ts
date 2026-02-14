import { NextRequest, NextResponse } from 'next/server';
import { sessionSchema, validateRequest } from '@/lib/validations';
import { apiSuccess, responses, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequest(request, sessionSchema);
    if (!validation.success) {
      return responses.badRequest(validation.error, validation.errors);
    }

    const { accessToken, refreshToken, expiresAt } = validation.data;

    // Calculate cookie expiration
    const expiresDate = new Date(expiresAt * 1000);
    const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create success response
    const response = NextResponse.json({ success: true, data: { sessionSet: true } });

    // Set secure httpOnly cookies
    response.cookies.set('sb-access-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      expires: expiresDate,
    });

    response.cookies.set('sb-refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      expires: refreshExpiresDate,
    });

    // Set session metadata (non-sensitive)
    response.cookies.set('session-active', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      expires: expiresDate,
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
} 