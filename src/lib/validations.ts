/**
 * Zod Validation Schemas
 * 
 * Centralized validation schemas for API requests and data.
 * Use these schemas to validate incoming data and ensure type safety.
 * 
 * @example
 * import { loginSchema, validateRequest } from '@/lib/validations';
 * 
 * export async function POST(request: Request) {
 *   const result = await validateRequest(request, loginSchema);
 *   if (!result.success) {
 *     return NextResponse.json({ error: result.error }, { status: 400 });
 *   }
 *   const { email, password } = result.data;
 *   // ... handle login
 * }
 */

import { z } from 'zod';

// ============================================
// Auth Schemas
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().optional(),
}).refine(
  (data) => !data.confirmPassword || data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);

export const sessionSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().min(1, 'Refresh token is required'),
  expiresAt: z.number().positive('Invalid expiration time'),
});

// ============================================
// Profile Schemas
// ============================================

export const createProfileSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  email: z.string().email('Invalid email').optional(),
  youtubeChannelId: z.string().optional(),
});

export const updateProfileSchema = z.object({
  youtubeChannelId: z.string().optional(),
  hasCompletedOnboarding: z.boolean().optional(),
});

// ============================================
// Subscription Schemas
// ============================================

export const checkoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  successUrl: z.string().url('Invalid success URL').optional(),
  cancelUrl: z.string().url('Invalid cancel URL').optional(),
});

export const verifySessionSchema = z.object({
  session_id: z.string().min(1, 'Session ID is required'),
});

// ============================================
// YouTube Schemas
// ============================================

export const channelSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(500, 'Query too long'),
  maxResults: z.number().min(1).max(50).optional().default(10),
});

export const channelIdSchema = z.object({
  channelId: z.string().min(1, 'Channel ID is required'),
});

export const videoIdSchema = z.object({
  videoId: z.string().min(1, 'Video ID is required'),
});

export const channelUrlSchema = z.object({
  url: z.string().url('Invalid URL').optional(),
  username: z.string().optional(),
  handle: z.string().optional(),
}).refine(
  (data) => data.url || data.username || data.handle,
  { message: 'Either url, username, or handle is required' }
);

// ============================================
// Competitor List Schemas
// ============================================

export const createCompetitorListSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
});

export const addCompetitorSchema = z.object({
  listId: z.string().uuid('Invalid list ID'),
  channelId: z.string().min(1, 'Channel ID is required'),
  channelName: z.string().optional(),
});

// ============================================
// Video Collection Schemas
// ============================================

export const createVideoCollectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
});

export const addVideoSchema = z.object({
  collectionId: z.string().uuid('Invalid collection ID'),
  videoId: z.string().min(1, 'Video ID is required'),
  videoTitle: z.string().optional(),
});

// ============================================
// Common Schemas
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'Start date must be before end date' }
);

// ============================================
// Validation Helper Functions
// ============================================

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; errors?: z.ZodIssue[] };

/**
 * Validate request body against a Zod schema
 */
export async function validateRequest<T extends z.ZodSchema>(
  request: Request,
  schema: T
): Promise<ValidationResult<z.infer<T>>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.issues;
      const errorMessage = errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { 
        success: false, 
        error: errorMessage,
        errors 
      };
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    return { 
      success: false, 
      error: 'Invalid JSON body' 
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T extends z.ZodSchema>(
  searchParams: URLSearchParams,
  schema: T
): ValidationResult<z.infer<T>> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  const result = schema.safeParse(params);
  
  if (!result.success) {
    const errors = result.error.issues;
    const errorMessage = errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { 
      success: false, 
      error: errorMessage,
      errors 
    };
  }
  
  return { success: true, data: result.data };
}

/**
 * Validate any data against a Zod schema
 */
export function validate<T extends z.ZodSchema>(
  data: unknown,
  schema: T
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.issues;
    const errorMessage = errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { 
      success: false, 
      error: errorMessage,
      errors 
    };
  }
  
  return { success: true, data: result.data };
}

// Export Zod for custom schemas
export { z };
