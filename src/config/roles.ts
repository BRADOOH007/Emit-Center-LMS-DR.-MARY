import type { Permission, Role } from '@/types';

export const ROLES: Role[] = ['super_admin', 'administrator', 'instructor', 'student', 'parent'];

export const ROLE_ORDER: Record<Role, number> = {
  super_admin: 5,
  administrator: 4,
  instructor: 3,
  student: 2,
  parent: 1,
};

export const ROLE_META: Record<
  Role,
  {
    label: string;
    pluralLabel: string;
    description: string;
    home: string;
    badge: 'gold' | 'brown' | 'neutral' | 'success';
  }
> = {
  super_admin: {
    label: 'Super Admin',
    pluralLabel: 'Super Admins',
    description: 'Full platform ownership, system configuration and user administration.',
    home: '/dashboard/admin',
    badge: 'gold',
  },
  administrator: {
    label: 'Administrator',
    pluralLabel: 'Administrators',
    description: 'Portal administration, enrollment and billing management.',
    home: '/dashboard/admin',
    badge: 'brown',
  },
  instructor: {
    label: 'Instructor',
    pluralLabel: 'Instructors',
    description: 'Teaching, class management, grading and announcements.',
    home: '/dashboard/instructor',
    badge: 'neutral',
  },
  student: {
    label: 'Student',
    pluralLabel: 'Students',
    description: 'Course catalog, enrollment, assignments and grades.',
    home: '/dashboard/student',
    badge: 'success',
  },
  parent: {
    label: 'Parent / Guardian',
    pluralLabel: 'Parents',
    description: 'View progress reports, payments and schedules for linked students.',
    home: '/dashboard/parent',
    badge: 'neutral',
  },
};

export const ALL_PERMISSIONS: readonly Permission[] = [
  'portal.access',
  'portal.super_admin',
  'dashboard.admin',
  'dashboard.instructor',
  'dashboard.student',
  'dashboard.parent',
  'courses.view',
  'courses.manage',
  'classes.view',
  'classes.manage',
  'enroll.self',
  'enroll.manage',
  'users.manage',
  'students.view',
  'instructors.manage',
  'grades.view',
  'grades.manage',
  'payments.view',
  'payments.manage',
  'reports.view',
  'settings.manage',
  'announcements.manage',
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: ALL_PERMISSIONS,
  administrator: [
    'portal.access',
    'dashboard.admin',
    'dashboard.student',
    'dashboard.parent',
    'courses.view',
    'courses.manage',
    'classes.view',
    'classes.manage',
    'enroll.manage',
    'users.manage',
    'students.view',
    'instructors.manage',
    'grades.view',
    'payments.view',
    'payments.manage',
    'reports.view',
    'settings.manage',
    'announcements.manage',
  ],
  instructor: [
    'portal.access',
    'dashboard.instructor',
    'courses.view',
    'classes.view',
    'students.view',
    'grades.view',
    'grades.manage',
    'payments.view',
    'announcements.manage',
  ],
  student: [
    'portal.access',
    'dashboard.student',
    'courses.view',
    'classes.view',
    'enroll.self',
    'grades.view',
    'payments.view',
  ],
  parent: [
    'portal.access',
    'dashboard.parent',
    'courses.view',
    'students.view',
    'grades.view',
    'payments.view',
  ],
};
