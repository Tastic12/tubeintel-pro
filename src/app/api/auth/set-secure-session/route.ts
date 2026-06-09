import { NextRequest, NextResponse } from 'next/server';
import { applyAuthCookies } from '@/lib/auth-cookies';
import { sessionSchema, validateRequest } from '@/lib/validations';
import { responses, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequest(request, sessionSchema);
    if (!validation.success) {
      return responses.badRequest(validation.error, validation.errors);
    }

    const { accessToken, refreshToken, expiresAt } = validation.data;
    const response = NextResponse.json({ success: true, data: { sessionSet: true } });

    applyAuthCookies(response, {
      accessToken,
      refreshToken,
      expiresAt,
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
