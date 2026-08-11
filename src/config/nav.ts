import type { Role } from '@/types';
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Settings,
  ShieldCheck,
  Users,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export const PORTAL_URL = 'https://www.emitcenter.com';
export const PORTAL_RETURN_LABEL = 'Return to main portal at emitcenter.com';

export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: string;
  exact?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const MAIN_NAV: NavItem[] = [
  { label: 'Programs', href: '/programs', icon: GraduationCap },
  { label: 'Courses', href: '/courses', icon: BookOpen },
  { label: 'Onsite Classes', href: '/classes/onsite', icon: CalendarDays },
  { label: 'Online Classes', href: '/classes/online', icon: BookOpen },
  { label: 'Student Dashboard', href: '/dashboard/student', icon: LayoutDashboard },
  { label: 'Instructor Portal', href: '/dashboard/instructor', icon: Users },
];

export const SIDEBAR_NAV: Record<Role, NavSection[]> = {
  super_admin: [
    {
      title: 'Overview',
      items: [
        { label: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard, exact: true },
        { label: 'Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Programs', href: '/dashboard/admin/programs', icon: GraduationCap },
        { label: 'Courses', href: '/dashboard/admin/courses', icon: BookOpen },
        { label: 'Classes', href: '/dashboard/admin/classes', icon: CalendarDays },
        { label: 'Users', href: '/dashboard/admin/users', icon: Users },
        { label: 'Enrollments', href: '/dashboard/admin/enrollments', icon: ClipboardList },
        { label: 'Payments', href: '/dashboard/admin/payments', icon: CreditCard },
        { label: 'Reports', href: '/dashboard/admin/reports', icon: FileBarChart },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Permissions', href: '/dashboard/admin/permissions', icon: ShieldCheck },
        { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
      ],
    },
  ],
  administrator: [
    {
      title: 'Overview',
      items: [
        { label: 'Overview', href: '/dashboard/admin', icon: LayoutDashboard, exact: true },
        { label: 'Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Programs', href: '/dashboard/admin/programs', icon: GraduationCap },
        { label: 'Courses', href: '/dashboard/admin/courses', icon: BookOpen },
        { label: 'Classes', href: '/dashboard/admin/classes', icon: CalendarDays },
        { label: 'Students', href: '/dashboard/admin/students', icon: UserRound },
        { label: 'Instructors', href: '/dashboard/admin/instructors', icon: Users },
        { label: 'Enrollments', href: '/dashboard/admin/enrollments', icon: ClipboardList },
        { label: 'Payments', href: '/dashboard/admin/payments', icon: CreditCard },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Reports', href: '/dashboard/admin/reports', icon: FileBarChart },
        { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
      ],
    },
  ],
  instructor: [
    {
      title: 'Overview',
      items: [{ label: 'Overview', href: '/dashboard/instructor', icon: LayoutDashboard, exact: true }],
    },
    {
      title: 'Teaching',
      items: [
        { label: 'My Classes', href: '/dashboard/instructor/classes', icon: CalendarDays },
        { label: 'My Courses', href: '/dashboard/instructor/courses', icon: BookOpen },
        { label: 'Student Roster', href: '/dashboard/instructor/roster', icon: UserRound },
        { label: 'Grades', href: '/dashboard/instructor/grades', icon: ClipboardList },
      ],
    },
    {
      title: 'Communication',
      items: [
        { label: 'Announcements', href: '/dashboard/instructor/announcements', icon: Megaphone },
        { label: 'Schedule', href: '/dashboard/instructor/schedule', icon: CalendarDays },
      ],
    },
  ],
  student: [
    {
      title: 'Overview',
      items: [{ label: 'Overview', href: '/dashboard/student', icon: LayoutDashboard, exact: true }],
    },
    {
      title: 'Learning',
      items: [
        { label: 'My Courses', href: '/dashboard/student/courses', icon: BookOpen },
        { label: 'My Classes', href: '/dashboard/student/classes', icon: CalendarDays },
        { label: 'Assignments', href: '/dashboard/student/assignments', icon: ClipboardList },
        { label: 'Grades', href: '/dashboard/student/grades', icon: FileBarChart },
        { label: 'Certificates', href: '/dashboard/student/certificates', icon: Award },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Schedule', href: '/dashboard/student/schedule', icon: CalendarDays },
        { label: 'Payments', href: '/dashboard/student/payments', icon: CircleDollarSign },
        { label: 'Support', href: '/dashboard/student/support', icon: Megaphone },
      ],
    },
  ],
  parent: [
    {
      title: 'Overview',
      items: [{ label: 'Overview', href: '/dashboard/parent', icon: LayoutDashboard, exact: true }],
    },
    {
      title: 'My Students',
      items: [
        { label: 'Linked Students', href: '/dashboard/parent/students', icon: UserRound },
        { label: 'Progress Reports', href: '/dashboard/parent/reports', icon: FileBarChart },
        { label: 'Grades', href: '/dashboard/parent/grades', icon: ClipboardList },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Schedule', href: '/dashboard/parent/schedule', icon: CalendarDays },
        { label: 'Payments', href: '/dashboard/parent/payments', icon: CircleDollarSign },
        { label: 'Contact Instructors', href: '/dashboard/parent/contact', icon: Megaphone },
      ],
    },
  ],
};
