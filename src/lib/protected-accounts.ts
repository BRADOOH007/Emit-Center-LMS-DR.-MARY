export const PROTECTED_ACCOUNT_EMAILS = [
  'marongo@learn.emitcenter.com',
  'mary.mwangi@emitcenter.com',
];

export function isProtectedAccount(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return PROTECTED_ACCOUNT_EMAILS.some((protectedEmail) => protectedEmail.toLowerCase() === normalized);
}
