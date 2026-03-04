/**
 * Production-safe error logger.
 * In development, logs full error details to console.
 * In production, logs only the context string (no sensitive details).
 */
export const logError = (context: string, error: unknown) => {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  } else {
    console.error(`[${context}] An error occurred`);
  }
};
