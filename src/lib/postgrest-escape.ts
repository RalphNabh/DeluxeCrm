/**
 * Escape user input used inside PostgREST filter strings (.or(), .filter()).
 * Prevents filter injection via commas, dots, and parentheses.
 */
export function escapePostgrestValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/[,().]/g, (c) => `\\${c}`);
}
