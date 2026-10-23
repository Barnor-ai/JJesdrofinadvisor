export function ownedStatementPath(path: string, userId: string) {
  const parts = path.split('/');
  return parts.length > 1 && parts[0] === userId && parts.slice(1).every(p => p.length > 0 && p !== '.' && p !== '..') && !path.includes('\\');
}

export function passwordError(password: string, confirmation: string) {
  if (password.length < 12) return 'Use at least 12 characters.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) return 'Include uppercase and lowercase letters, a number and a symbol.';
  if (password !== confirmation) return 'The new passwords do not match.';
  return null;
}

export function safeNextPath(next?: string) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\') || /[\r\n]/.test(next)) return '/dashboard';
  return next;
}