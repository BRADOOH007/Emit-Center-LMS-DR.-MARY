import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getRoleHome } from '@/lib/roles';
import type { Role, User } from '@/types';

export async function getUserOrRedirect(): Promise<User> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session.user;
}

function hasRole(user: User, role: Role): boolean {
  return user.roles.includes(role) || user.activeRole === role;
}

function homeFor(user: User): string {
  return getRoleHome(user.activeRole);
}

export async function requireAdmin(): Promise<User> {
  const user = await getUserOrRedirect();
  if (!user.roles.some((role) => role === 'administrator' || role === 'super_admin')) {
    redirect(homeFor(user));
  }
  return user;
}

export async function requireSuperAdmin(): Promise<User> {
  const user = await getUserOrRedirect();
  if (!user.roles.includes('super_admin')) {
    redirect(homeFor(user));
  }
  return user;
}

export async function requireInstructor(): Promise<User> {
  const user = await getUserOrRedirect();
  if (!hasRole(user, 'instructor') && !user.roles.includes('super_admin')) {
    redirect(homeFor(user));
  }
  return user;
}

export async function requireStudent(): Promise<User> {
  const user = await getUserOrRedirect();
  if (!hasRole(user, 'student')) {
    redirect(homeFor(user));
  }
  return user;
}

export async function requireParent(): Promise<User> {
  const user = await getUserOrRedirect();
  if (!hasRole(user, 'parent')) {
    redirect(homeFor(user));
  }
  return user;
}