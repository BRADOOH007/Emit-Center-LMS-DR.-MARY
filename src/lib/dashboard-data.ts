export function getMockIdentity(
  sessionUser: { user: { id: string; fullName?: string; name?: string; email: string } } | null | undefined,
): { id: string; name: string; email: string } {
  if (sessionUser?.user) {
    return {
      id: sessionUser.user.id,
      name: sessionUser.user.fullName ?? sessionUser.user.name ?? sessionUser.user.email,
      email: sessionUser.user.email,
    };
  }
  return { id: '', name: '', email: '' };
}
