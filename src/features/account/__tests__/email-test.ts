import { isValidEmail, normalizeEmail } from '../email';

describe('email input', () => {
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
});
