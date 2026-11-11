/**
 * Extracts a readable message from an unknown error value.
 * Use instead of `(err: any)` in catch blocks.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}
