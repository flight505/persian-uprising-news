/**
 * Channel Suggestion Validator
 * SEC-002: Zod-based validation for channel suggestions
 *
 * Security features:
 * - XSS prevention
 * - URL validation and sanitization
 * - Length limits
 * - Email validation
 */

import { z } from 'zod';

// Platform types
export const CHANNEL_TYPES = [
  'telegram',
  'twitter',
  'reddit',
  'instagram',
  'youtube',
  'rss',
  'other',
] as const;

export type ChannelType = typeof CHANNEL_TYPES[number];

// XSS prevention pattern
const SAFE_TEXT_PATTERN = /^[^<>{}[\]]*$/;
const XSS_ERROR = 'Text contains potentially dangerous characters';

// Safe string validator factory
const safeString = (minLen: number, maxLen: number, fieldName: string) =>
  z.string()
    .min(minLen, `${fieldName} must be at least ${minLen} characters`)
    .max(maxLen, `${fieldName} must not exceed ${maxLen} characters`)
    .refine(
      (val) => SAFE_TEXT_PATTERN.test(val),
      { message: `${fieldName}: ${XSS_ERROR}` }
    );

// Handle validator with platform-specific patterns
const channelHandle = z.string()
  .min(1, 'Handle is required')
  .max(200, 'Handle must not exceed 200 characters')
  .refine(
    (val) => SAFE_TEXT_PATTERN.test(val),
    { message: 'Handle contains invalid characters' }
  )
  .refine(
    (val) => !/[\s\n\r]/.test(val.trim()) || val.includes(' '), // Allow spaces only if intended (display names)
    { message: 'Handle should not contain line breaks' }
  );

// URL validator with security checks
const safeUrl = z.string()
  .url('Invalid URL format')
  .max(500, 'URL must not exceed 500 characters')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    { message: 'URL must use http or https protocol' }
  )
  .refine(
    (url) => !url.includes('javascript:'),
    { message: 'URL contains blocked protocol' }
  )
  .optional();

// Email validator
const optionalEmail = z.string()
  .email('Invalid email format')
  .max(254, 'Email must not exceed 254 characters')
  .optional()
  .or(z.literal('')); // Allow empty string

// Channel suggestion creation schema
export const CreateChannelSuggestionSchema = z.object({
  type: z.enum(CHANNEL_TYPES, {
    message: `Type must be one of: ${CHANNEL_TYPES.join(', ')}`,
  }),

  handle: channelHandle,

  displayName: safeString(1, 200, 'Display name').optional(),

  description: safeString(0, 500, 'Description').optional(),

  url: safeUrl,

  submitterEmail: optionalEmail.transform((val) => val || undefined),

  reason: safeString(10, 1000, 'Reason')
    .refine(
      (val) => val.trim().split(/\s+/).length >= 3,
      { message: 'Reason must contain at least 3 words' }
    ),
}).strict().refine(
  (data) => {
    // Platform-specific handle validation
    switch (data.type) {
      case 'telegram':
        return /^@?[a-zA-Z][a-zA-Z0-9_]{3,30}$/.test(data.handle.replace('@', '')) ||
               data.handle.startsWith('https://t.me/');
      case 'twitter':
        return /^@?[a-zA-Z0-9_]{1,15}$/.test(data.handle.replace('@', ''));
      case 'youtube':
        return /^@?[a-zA-Z0-9_-]{1,50}$/.test(data.handle.replace('@', '')) ||
               data.handle.includes('youtube.com/');
      case 'reddit':
        return /^r\/[a-zA-Z0-9_]{2,21}$/.test(data.handle) ||
               /^u\/[a-zA-Z0-9_-]{3,20}$/.test(data.handle);
      case 'instagram':
        return /^@?[a-zA-Z0-9._]{1,30}$/.test(data.handle.replace('@', ''));
      case 'rss':
        return data.url !== undefined; // RSS requires URL
      default:
        return true; // 'other' accepts any format
    }
  },
  {
    message: 'Invalid handle format for the selected platform',
    path: ['handle'],
  }
);

// Admin update schema
export const UpdateChannelSuggestionSchema = z.object({
  suggestionId: z.string().min(1).max(100),
  status: z.enum(['pending', 'approved', 'rejected']),
  rejectionReason: safeString(0, 500, 'Rejection reason').optional(),
}).refine(
  (data) => {
    // Rejection requires a reason
    if (data.status === 'rejected' && !data.rejectionReason) {
      return false;
    }
    return true;
  },
  { message: 'Rejection reason is required when rejecting a suggestion', path: ['rejectionReason'] }
);

// Query parameters schema
export const ChannelSuggestionQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  type: z.enum(CHANNEL_TYPES).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

// Type exports
export type CreateChannelSuggestionInput = z.infer<typeof CreateChannelSuggestionSchema>;
export type UpdateChannelSuggestionInput = z.infer<typeof UpdateChannelSuggestionSchema>;
export type ChannelSuggestionQueryInput = z.infer<typeof ChannelSuggestionQuerySchema>;

// Validation result type
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

// Validation functions
export function validateCreateChannelSuggestion(data: unknown): ValidationResult<CreateChannelSuggestionInput> {
  const result = CreateChannelSuggestionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validateUpdateChannelSuggestion(data: unknown): ValidationResult<UpdateChannelSuggestionInput> {
  const result = UpdateChannelSuggestionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validateChannelSuggestionQuery(params: Record<string, string | null>): ValidationResult<ChannelSuggestionQueryInput> {
  const cleanParams: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== null) {
      cleanParams[key] = value;
    }
  }

  const result = ChannelSuggestionQuerySchema.safeParse(cleanParams);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// Utility: Format Zod errors for API response
export function formatZodErrors(error: z.ZodError): { field: string; message: string }[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));
}

// Utility: Normalize handle for storage
export function normalizeHandle(handle: string, type: ChannelType): string {
  let normalized = handle.trim();

  switch (type) {
    case 'telegram':
      // Remove @ prefix and t.me URL prefix
      normalized = normalized.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '');
      break;
    case 'twitter':
      normalized = normalized.replace(/^@/, '');
      break;
    case 'instagram':
      normalized = normalized.replace(/^@/, '');
      break;
    case 'youtube':
      normalized = normalized.replace(/^@/, '');
      break;
  }

  return normalized;
}
