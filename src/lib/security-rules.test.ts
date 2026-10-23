import { describe, expect, it } from 'vitest';
import { ownedStatementPath, passwordError, safeNextPath } from './security-rules';
describe('customer security', () => {
  it('only accepts the current owner statement folder', () => {
    expect(ownedStatementPath('alice/report.pdf', 'alice')).toBe(true);
    expect(ownedStatementPath('bob/report.pdf', 'alice')).toBe(false);
    expect(ownedStatementPath('alice/../bob/report.pdf', 'alice')).toBe(false);
    expect(ownedStatementPath('alice\\bob/report.pdf', 'alice')).toBe(false);
  });
  it('requires strong matching passwords', () => {
    expect(passwordError('Short1!', 'Short1!')).not.toBeNull();
    expect(passwordError('longpassword123', 'longpassword123')).not.toBeNull();
    expect(passwordError('LongPassword12!', 'different')).not.toBeNull();
    expect(passwordError('LongPassword12!', 'LongPassword12!')).toBeNull();
  });
  it('rejects external login destinations', () => {
    expect(safeNextPath('//evil.example')).toBe('/dashboard');
    expect(safeNextPath('/\\evil.example')).toBe('/dashboard');
    expect(safeNextPath('/analyses')).toBe('/analyses');
  });
});