/**
 * Incident Input Validator
 * SEC-002: Zod-based validation for incident reports
 *
 * Security features:
 * - XSS prevention (blocks HTML/script tags)
 * - Length limits (DOS prevention)
 * - Geographic coordinate validation
 * - URL sanitization
 * - Enum validation
 */

import { z } from 'zod';

// XSS prevention: Pattern to block dangerous characters
const SAFE_TEXT_PATTERN = /^[^<>{}[\]]*$/;
const XSS_ERROR = 'Text contains potentially dangerous characters';

// Reusable safe string validator
const safeString = (minLen: number, maxLen: number, fieldName: string) =>
  z.string()
    .min(minLen, `${fieldName} must be at least ${minLen} characters`)
    .max(maxLen, `${fieldName} must not exceed ${maxLen} characters`)
    .refine(
      (val) => SAFE_TEXT_PATTERN.test(val),
      { message: `${fieldName}: ${XSS_ERROR}` }
    )
    .refine(
      (val) => !/<script|javascript:|on\w+=/i.test(val),
      { message: `${fieldName} contains blocked content` }
    );

// Geographic coordinate validators
const latitude = z.number()
  .min(-90, 'Latitude must be >= -90')
  .max(90, 'Latitude must be <= 90')
  .refine((val) => !isNaN(val), 'Latitude must be a valid number');

const longitude = z.number()
  .min(-180, 'Longitude must be >= -180')
  .max(180, 'Longitude must be <= 180')
  .refine((val) => !isNaN(val), 'Longitude must be a valid number');

// URL validator with additional security checks
const safeUrl = z.string()
  .url('Invalid URL format')
  .max(500, 'URL must not exceed 500 characters')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Only allow http/https protocols
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
  );

// Location schema
const LocationSchema = z.object({
  lat: latitude,
  lon: longitude,
  address: safeString(0, 300, 'Address').optional(),
}).strict();

// Related article schema
const RelatedArticleSchema = z.object({
  title: safeString(1, 200, 'Article title'),
  url: safeUrl,
  source: safeString(1, 100, 'Source'),
}).strict();

// Main incident schema for POST requests
export const CreateIncidentSchema = z.object({
  type: z.enum(['protest', 'arrest', 'injury', 'death', 'other'], {
    message: 'Type must be one of: protest, arrest, injury, death, other',
  }),
  title: safeString(10, 200, 'Title'),
  description: safeString(20, 2000, 'Description'),
  location: LocationSchema,
  timestamp: z.number()
    .positive('Timestamp must be positive')
    .optional()
    .refine(
      (val) => !val || val <= Date.now() + 86400000, // Allow up to 1 day in future for timezone issues
      { message: 'Timestamp cannot be more than 1 day in the future' }
    ),
  images: z.array(safeUrl)
    .max(5, 'Maximum 5 images allowed')
    .optional()
    .default([]),
  relatedArticles: z.array(RelatedArticleSchema)
    .max(10, 'Maximum 10 related articles allowed')
    .optional(),
}).strict();

// Schema for incident updates (all fields optional except id)
export const UpdateIncidentSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(['protest', 'arrest', 'injury', 'death', 'other']).optional(),
  title: safeString(10, 200, 'Title').optional(),
  description: safeString(20, 2000, 'Description').optional(),
  location: LocationSchema.optional(),
  verified: z.boolean().optional(),
  images: z.array(safeUrl).max(5).optional(),
}).strict();

// Schema for GET query parameters
export const IncidentQuerySchema = z.object({
  type: z.enum(['protest', 'arrest', 'injury', 'death', 'other']).optional(),
  northLat: z.coerce.number().min(-90).max(90).optional(),
  southLat: z.coerce.number().min(-90).max(90).optional(),
  eastLon: z.coerce.number().min(-180).max(180).optional(),
  westLon: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().min(1).max(500).optional().default(100),
  offset: z.coerce.number().min(0).optional().default(0),
}).refine(
  (data) => {
    // If any bound is provided, all must be provided
    const bounds = [data.northLat, data.southLat, data.eastLon, data.westLon];
    const hasAny = bounds.some((b) => b !== undefined);
    const hasAll = bounds.every((b) => b !== undefined);
    return !hasAny || hasAll;
  },
  { message: 'If filtering by bounds, all four coordinates (northLat, southLat, eastLon, westLon) are required' }
);

// Type exports
export type CreateIncidentInput = z.infer<typeof CreateIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof UpdateIncidentSchema>;
export type IncidentQueryInput = z.infer<typeof IncidentQuerySchema>;

// Validation result type
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

// Validation functions
export function validateCreateIncident(data: unknown): ValidationResult<CreateIncidentInput> {
  const result = CreateIncidentSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validateUpdateIncident(data: unknown): ValidationResult<UpdateIncidentInput> {
  const result = UpdateIncidentSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validateIncidentQuery(params: Record<string, string | null>): ValidationResult<IncidentQueryInput> {
  // Convert null values to undefined for Zod
  const cleanParams: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== null) {
      cleanParams[key] = value;
    }
  }

  const result = IncidentQuerySchema.safeParse(cleanParams);
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
