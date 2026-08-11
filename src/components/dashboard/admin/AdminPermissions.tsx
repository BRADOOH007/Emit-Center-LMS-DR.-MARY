'use client';

import { useMemo, useState } from 'react';
import { ShieldCheck, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS, ROLES, ROLE_META } from '@/config/roles';
import type { Permission, Role } from '@/types';
import { cn } from '@/lib/utils';

const PERMISSION_LABELS: Record<Permission, string> = {
  'portal.access': 'Portal access',
  'portal.super_admin': 'Super admin console',
  'dashboard.admin': 'Admin dashboard',
  'dashboard.instructor': 'Instructor dashboard',
  'dashboard.student': 'Student dashboard',
  'dashboard.parent': 'Parent dashboard',
  'courses.view': 'View courses',
  'courses.manage': 'Manage courses',
  'classes.view': 'View classes',
  'classes.manage': 'Manage classes',
  'enroll.self': 'Self-enroll',
  'enroll.manage': 'Manage enrollments',
  'users.manage': 'Manage users',
  'students.view': 'View students',
  'instructors.manage': 'Manage instructors',
  'grades.view': 'View grades',
  'grades.manage': 'Manage grades',
  'payments.view': 'View payments',
  'payments.manage': 'Manage payments',
  'reports.view': 'View reports',
  'settings.manage': 'Manage settings',
  'announcements.manage': 'Manage announcements',
};

export function AdminPermissions() {
  const [selectedRole, setSelectedRole] = useState<Role>('administrator');

  const granted = useMemo(() => ROLE_PERMISSIONS[selectedRole], [selectedRole]);

  const toggleInSelected = () => {
    // In a live system toggling would persist; here we keep the matrix readonly.
  };

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Admin · Permissions"
        title="Role Permissions"
        subtitle="Fine-grained access control across all five platform roles."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Roles" value={ROLES.length} hint="Platform roles" icon={ShieldCheck} tone="gold" />
        <StatCard label="Permissions" value={ALL_PERMISSIONS.length} hint="Granular scopes" icon={ShieldCheck} tone="blue" />
        <StatCard label="Super Admin Scope" value={ROLE_PERMISSIONS.super_admin.length} hint="All permissions" icon={ShieldCheck} tone="brown" />
        <StatCard label="Full Access" value={ROLES.filter((r) => ROLE_PERMISSIONS[r].length === ALL_PERMISSIONS.length).length} hint="Roles with full scope" icon={UserCog} tone="emerald" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <SectionPanel title="Roles" icon={ShieldCheck} className="lg:col-span-1">
          <ul className="space-y-1">
            {ROLES.map((role) => (
              <li key={role}>
                <button
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                    selectedRole === role
                      ? 'bg-gold-500/10 text-gold-700 dark:text-gold-300'
                      : 'text-text-primary hover:bg-line-soft',
                  )}
                >
                  <span>{ROLE_META[role].label}</span>
                  <Badge variant={ROLE_META[role].badge}>{ROLE_PERMISSIONS[role].length}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </SectionPanel>

        <SectionPanel
          title={`Permissions for ${ROLE_META[selectedRole].label}`}
          icon={ShieldCheck}
          className="lg:col-span-4"
          actions={<span className="text-xs text-text-muted">{granted.length} of {ALL_PERMISSIONS.length} granted</span>}
        >
          <p className="mb-4 max-w-lg text-xs text-text-muted">{ROLE_META[selectedRole].description}</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {ALL_PERMISSIONS.map((permission) => {
              const has = granted.includes(permission);
              return (
                <label
                  key={permission}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
                    has ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-line bg-base-surface',
                  )}
                >
                  <span className={cn('text-text-primary', !has && 'text-text-muted')}>
                    {PERMISSION_LABELS[permission]}
                  </span>
                  <span
                    onClick={toggleInSelected}
                    role="switch"
                    aria-checked={has}
                    aria-label={`${PERMISSION_LABELS[permission]} for ${ROLE_META[selectedRole].label}`}
                    className={cn(
                      'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                      has ? 'bg-emerald-500' : 'bg-line',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                        has ? 'translate-x-4' : 'translate-x-0.5',
                      )}
                    />
                  </span>
                </label>
              );
            })}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}