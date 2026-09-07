/** Reusable regular expressions for validation rules not provided by Angular. */
export const VALIDATION_PATTERNS = {
  containsVisibleCharacter: /\S/,
} as const;

/** Shared field limits keep form controls and UI counters synchronized. */
export const VALIDATION_LIMITS = {
  passwordMinLength: 8,
  taskTitleMaxLength: 100,
  taskDescriptionMaxLength: 500,
} as const;
