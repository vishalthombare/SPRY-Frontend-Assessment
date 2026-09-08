/** Cross-cutting application settings that are not environment-specific. */
export const APP_CONSTANTS = {
  apiTimeoutMs: 30_000,
  defaultPageSize: 10,
  toastDurationMs: 4_000,
} as const;
