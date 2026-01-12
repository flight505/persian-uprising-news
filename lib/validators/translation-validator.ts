/**
 * Translation Input Validator
 * SEC-002: Zod-based validation for translation requests
 *
 * Security features:
 * - Length limits (DOS prevention)
 * - Language enum validation
 * - XSS content filtering for certain patterns
 */

import { z } from 'zod';

// Supported languages
export const SUPPORTED_LANGUAGES = ['en', 'fa'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Maximum text length for translation (prevents memory exhaustion)
const MAX_TEXT_LENGTH = 10000;

// Patterns that indicate potential abuse (not normal text)
const ABUSE_PATTERNS = [
  /(.)\1{50,}/, // Same character repeated 50+ times
  /<script[\s\S]*?<\/script>/gi, // Script tags
  /javascript:/gi, // JavaScript protocol
  /data:/gi, // Data URIs
];

// Translation request schema
export const TranslationRequestSchema = z.object({
  text: z.string()
    .min(1, 'Text is required')
    .max(MAX_TEXT_LENGTH, `Text must not exceed ${MAX_TEXT_LENGTH} characters`)
    .refine(
      (text) => text.trim().length > 0,
      { message: 'Text cannot be empty or whitespace only' }
    )
    .refine(
      (text) => !ABUSE_PATTERNS.some((pattern) => pattern.test(text)),
      { message: 'Text contains invalid content patterns' }
    ),

  sourceLang: z.enum(SUPPORTED_LANGUAGES, {
    message: `Source language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`,
  }).optional(),

  targetLang: z.enum(SUPPORTED_LANGUAGES, {
    message: `Target language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`,
  }),

  autoDetect: z.boolean().optional().default(false),
}).refine(
  (data) => {
    // Source and target should be different if source is specified
    if (data.sourceLang && data.sourceLang === data.targetLang) {
      return data.autoDetect; // Allow if autoDetect might correct this
    }
    return true;
  },
  { message: 'Source and target languages must be different' }
);

// Batch translation schema (for future use)
export const BatchTranslationRequestSchema = z.object({
  texts: z.array(
    z.string()
      .min(1)
      .max(MAX_TEXT_LENGTH)
  )
    .min(1, 'At least one text is required')
    .max(50, 'Maximum 50 texts per batch'),

  sourceLang: z.enum(SUPPORTED_LANGUAGES).optional(),
  targetLang: z.enum(SUPPORTED_LANGUAGES),
  autoDetect: z.boolean().optional().default(false),
});

// Type exports
export type TranslationRequestInput = z.infer<typeof TranslationRequestSchema>;
export type BatchTranslationRequestInput = z.infer<typeof BatchTranslationRequestSchema>;

// Validation result type
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

// Validation functions
export function validateTranslationRequest(data: unknown): ValidationResult<TranslationRequestInput> {
  const result = TranslationRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function validateBatchTranslationRequest(data: unknown): ValidationResult<BatchTranslationRequestInput> {
  const result = BatchTranslationRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// Utility: Sanitize text for translation
export function sanitizeTranslationText(text: string): string {
  // Remove null bytes
  let sanitized = text.replace(/\0/g, '');

  // Normalize whitespace (but preserve meaningful spaces)
  sanitized = sanitized.replace(/[\t\r]+/g, ' ');

  // Remove control characters except newlines
  sanitized = sanitized.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized.trim();
}

// Utility: Format Zod errors for API response
export function formatZodErrors(error: z.ZodError): { field: string; message: string }[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));
}

// Utility: Estimate if text is primarily in a specific language
export function estimateLanguage(text: string): SupportedLanguage | null {
  // Persian/Arabic character range
  const persianPattern = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const persianChars = (text.match(persianPattern) || []).length;

  // Latin character range
  const latinPattern = /[a-zA-Z]/g;
  const latinChars = (text.match(latinPattern) || []).length;

  const total = persianChars + latinChars;
  if (total === 0) return null;

  const persianRatio = persianChars / total;

  if (persianRatio > 0.5) return 'fa';
  if (persianRatio < 0.3) return 'en';

  return null; // Ambiguous
}
