/**
 * Standardized API Response Utilities
 * 
 * Provides consistent response format across all API routes.
 * 
 * @example
 * import { apiSuccess, apiError, ApiError } from '@/lib/api-response';
 * 
 * // Success response
 * return apiSuccess({ user: userData });
 * 
 * // Error response
 * return apiError('User not found', 404);
 * 
 * // Throw an API error
 * throw new ApiError('Unauthorized', 401);
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================
// Types
// ============================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================
// Error Class
// ============================================

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message: string = 'Unauthorized'): ApiError {
    return new ApiError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Forbidden'): ApiError {
    return new ApiError(message, 403, 'FORBIDDEN');
  }

  static notFound(message: string = 'Resource not found'): ApiError {
    return new ApiError(message, 404, 'NOT_FOUND');
  }

  static conflict(message: string, details?: unknown): ApiError {
    return new ApiError(message, 409, 'CONFLICT', details);
  }

  static tooManyRequests(message: string = 'Too many requests'): ApiError {
    return new ApiError(message, 429, 'TOO_MANY_REQUESTS');
  }

  static internal(message: string = 'Internal server error'): ApiError {
    return new ApiError(message, 500, 'INTERNAL_ERROR');
  }

  static validationError(errors: z.ZodIssue[]): ApiError {
    const message = errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return new ApiError(message, 400, 'VALIDATION_ERROR', errors);
  }
}

// ============================================
// Response Helpers
// ============================================

/**
 * Create a success response
 */
export function apiSuccess<T>(
  data: T,
  meta?: ApiSuccessResponse['meta'],
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return NextResponse.json(response, { status });
}

/**
 * Create an error response
 */
export function apiError(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const errorObj: ApiErrorResponse['error'] = { message };
  
  if (code) {
    errorObj.code = code;
  }
  
  if (details) {
    errorObj.details = details;
  }
  
  const response: ApiErrorResponse = {
    success: false,
    error: errorObj,
  };

  return NextResponse.json(response, { status });
}

/**
 * Create a response from an ApiError instance
 */
export function apiErrorFromException(error: ApiError): NextResponse<ApiErrorResponse> {
  return apiError(error.message, error.statusCode, error.code, error.details);
}

/**
 * Handle unknown errors and return appropriate response
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  // If it's already an ApiError, use it directly
  if (error instanceof ApiError) {
    return apiErrorFromException(error);
  }

  // If it's a standard Error, extract the message
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message;
    
    return apiError(message, 500, 'INTERNAL_ERROR');
  }

  // Unknown error type
  return apiError('An unexpected error occurred', 500, 'UNKNOWN_ERROR');
}

// ============================================
// Validation + Response Combo
// ============================================

/**
 * Validate request and return error response if invalid
 * Returns the validated data or null (with response already sent)
 */
export async function validateRequestWithResponse<T extends z.ZodSchema>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T> } | { error: NextResponse<ApiErrorResponse> }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return {
        error: apiError(
          'Validation failed',
          400,
          'VALIDATION_ERROR',
          result.error.issues
        ),
      };
    }
    
    return { data: result.data };
  } catch {
    return {
      error: apiError('Invalid JSON body', 400, 'INVALID_JSON'),
    };
  }
}

// ============================================
// Response Shortcuts
// ============================================

export const responses = {
  ok: <T>(data: T) => apiSuccess(data, undefined, 200),
  created: <T>(data: T) => apiSuccess(data, undefined, 201),
  noContent: () => new NextResponse(null, { status: 204 }),
  
  badRequest: (message: string, details?: unknown) => 
    apiError(message, 400, 'BAD_REQUEST', details),
  unauthorized: (message: string = 'Unauthorized') => 
    apiError(message, 401, 'UNAUTHORIZED'),
  forbidden: (message: string = 'Forbidden') => 
    apiError(message, 403, 'FORBIDDEN'),
  notFound: (message: string = 'Resource not found') => 
    apiError(message, 404, 'NOT_FOUND'),
  conflict: (message: string, details?: unknown) => 
    apiError(message, 409, 'CONFLICT', details),
  tooManyRequests: (message: string = 'Too many requests') => 
    apiError(message, 429, 'TOO_MANY_REQUESTS'),
  internal: (message: string = 'Internal server error') => 
    apiError(message, 500, 'INTERNAL_ERROR'),
};
