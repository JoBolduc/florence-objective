import { isCompleteCode, isValidEmail, normalizeCode, normalizeEmail } from '../email-code';

describe('email and code input', () => {
  it('normalizes the address', () => {
    expect(normalizeEmail('  Parent@Example.COM ')).toBe('parent@example.com');
  });

  it('validates the address shape', () => {
    expect(isValidEmail('parent@example.com')).toBe(true);
    expect(isValidEmail(' parent@example.com ')).toBe(true);
    expect(isValidEmail('parent@example')).toBe(false);
    expect(isValidEmail('parent example.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('keeps only the six digits of a pasted code', () => {
    expect(normalizeCode('123 456')).toBe('123456');
    expect(normalizeCode('12-34-56-78')).toBe('123456');
    expect(isCompleteCode('123 456')).toBe(true);
    expect(isCompleteCode('12345')).toBe(false);
  });
});
