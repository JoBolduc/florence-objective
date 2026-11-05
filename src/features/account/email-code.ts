const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CODE_LENGTH = 6;

/** Trims and lowercases, so a pasted or auto-capitalised address still matches. */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEmail(input: string): boolean {
  return EMAIL.test(normalizeEmail(input));
}

/** Keeps digits only (the code is often pasted with spaces) and caps the length. */
export function normalizeCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

export function isCompleteCode(input: string): boolean {
  return normalizeCode(input).length === CODE_LENGTH;
}
