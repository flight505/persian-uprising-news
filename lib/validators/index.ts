/**
 * Validators Index
 * SEC-002: Central export for all Zod validators
 */

// Incident validators
export {
  CreateIncidentSchema,
  UpdateIncidentSchema,
  IncidentQuerySchema,
  validateCreateIncident,
  validateUpdateIncident,
  validateIncidentQuery,
  formatZodErrors,
  type CreateIncidentInput,
  type UpdateIncidentInput,
  type IncidentQueryInput,
} from './incident-validator';

// Translation validators
export {
  TranslationRequestSchema,
  BatchTranslationRequestSchema,
  SUPPORTED_LANGUAGES,
  validateTranslationRequest,
  validateBatchTranslationRequest,
  sanitizeTranslationText,
  estimateLanguage,
  type SupportedLanguage,
  type TranslationRequestInput,
  type BatchTranslationRequestInput,
} from './translation-validator';

// Channel validators
export {
  CreateChannelSuggestionSchema,
  UpdateChannelSuggestionSchema,
  ChannelSuggestionQuerySchema,
  CHANNEL_TYPES,
  validateCreateChannelSuggestion,
  validateUpdateChannelSuggestion,
  validateChannelSuggestionQuery,
  normalizeHandle,
  type ChannelType,
  type CreateChannelSuggestionInput,
  type UpdateChannelSuggestionInput,
  type ChannelSuggestionQueryInput,
} from './channel-validator';
