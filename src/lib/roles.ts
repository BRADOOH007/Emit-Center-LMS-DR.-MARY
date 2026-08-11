import { ROLE_META, ROLE_PERMISSIONS, ROLE_ORDER } from '@/config/roles';
import type { Permission, Role, User } from '@/types';

export function getRoleHome(role: Role): string {
  return ROLE_META[role].home;
}

export function getActiveRoleHome(user: User): string {
  return ROLE_META[user.activeRole].home;
}

export function getPermissions(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function can(user: User, permission: Permission): boolean {
  return ROLE_PERMISSIONS[user.activeRole].includes(permission);
}

export function canAny(user: User, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => can(user, permission));
}

export function canAll(user: User, permissions: readonly Permission[]): boolean {
  return permissions.every((permission) => can(user, permission));
}

export function hasRole(user: User, role: Role): boolean {
  return user.roles.includes(role);
}

export function switchRole(user: User, role: Role): User {
  if (!user.roles.includes(role)) {
    return user;
  }
  return { ...user, activeRole: role };
}

export function roleTier(role: Role): number {
  return ROLE_ORDER[role];
}

export function highestTierRole(user: User): Role {
  return [...user.roles].sort((a, b) => roleTier(b) - roleTier(a))[0];
}
