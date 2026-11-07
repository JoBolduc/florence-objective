const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trims and lowercases, so a pasted or auto-capitalised address still matches. */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEmail(input: string): boolean {
  return EMAIL.test(normalizeEmail(input));
}
