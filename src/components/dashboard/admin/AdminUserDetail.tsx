'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
  Key,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  AtSign,
  ShieldCheck,
  UserCheck,
  Users,
  Users2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale } from '@/components/providers/AppProviders';
import { useToast } from '@/components/ui/toast';
import { LogoMark } from '@/components/ui/LogoMark';
import type { Role } from '@/types';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  administrator: 'Admin',
  instructor: 'Instructor',
  student: 'Student',
  parent: 'Parent',
};

const ROLE_TONES: Record<Role, 'gold' | 'brown' | 'neutral' | 'success'> = {
  super_admin: 'gold',
  administrator: 'brown',
  instructor: 'neutral',
  student: 'success',
  parent: 'neutral',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  guardian: 'Guardian',
  mother: 'Mother',
  father: 'Father',
  sponsor: 'Sponsor',
};

interface CourseBrief {
  id: string;
  title: string;
  subject: string;
  isPublished: boolean;
  enrolledCount: number;
}

interface UserDetailData {
  id: string;
  fullName: string;
  email: string;
  username?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  countryCode: string;
  timezone: string;
  locale: string;
  currency: string;
  roles: Role[];
  activeRole: Role;
  emailVerifiedAt: string | null;
  createdAt: string;
  enrollments: { id: string; status: string; createdAt: string; course: CourseBrief }[];
  coursesTaught: CourseBrief[];
  parentLinks: { id: string; relationshipType: string; parent: { id: string; fullName: string; email: string }; student: { id: string; fullName: string; email: string } }[];
  studentLinks: { id: string; relationshipType: string; parent: { id: string; fullName: string; email: string }; student: { id: string; fullName: string; email: string } }[];
  recentSessions: { id: string; createdAt: string; expiresAt: string; revokedAt: string | null; ipAddress: string | null; userAgent: string | null }[];
  auditLogs: { id: string; action: string; resourceType: string; resourceId: string | null; createdAt: string }[];
  counts: { payments: number; certificates: number; quizAttempts: number; submissions: number };
}

function activityLabel(action: string): string {
  const map: Record<string, string> = {
    'auth.login': 'Signed in',
    'user.login': 'Signed in',
    'admin.user.student.created': 'Student created',
    'admin.user.parent.created': 'Parent created',
    'admin.user.instructor.created': 'Instructor created',
    'admin.user.administrator.created': 'Admin created',
    'admin.user.password_reset': 'Password reset',
    'settings.ai_update': 'AI settings updated',
  };
  return map[action] ?? action.replace(/[._]/g, ' ');
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function AdminUserDetail({ userId }: { userId: string }) {
  const { formatDateTime } = useLocale();
  const toast = useToast();
  const [user, setUser] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [revealedPwd, setRevealedPwd] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/users/${userId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => setUser(json.data))
      .catch(() => setError('User not found'))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRegenerate = async () => {
    if (!confirm('Reset the password for this user? Their current password will be replaced and all active sessions revoked.')) return;
    setPwdLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/password`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Failed to reset password', json.error);
        return;
      }
      setRevealedPwd(json.data.password);
      setShowPwd(true);
      setUser((prev) => (prev ? { ...prev, emailVerifiedAt: new Date().toISOString() } : prev));
      toast.success('Password reset', `New temporary password: ${json.data.password}`);
    } catch {
      toast.error('Failed to reset password');
    } finally {
      setPwdLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!user || !revealedPwd) return;
    navigator.clipboard.writeText(`Username: ${user.username ?? user.email}\nEmail: ${user.email}\nPassword: ${revealedPwd}`).catch(() => {});
    toast.success('Copied to clipboard', 'Credentials are ready to share.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LogoMark size={64} showLabel={false} />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <PageIntro kicker="Admin · Users" title="User not found" subtitle={error ?? 'This user may have been deleted.'} />
        <ButtonLinkHref href="/dashboard/admin/users">
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </ButtonLinkHref>
      </div>
    );
  }

  const linkedAsParent = user.parentLinks;
  const linkedAsStudent = user.studentLinks;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/admin/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400">
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Link>
      </div>

      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <UserAvatar name={user.fullName} src={user.avatarUrl ?? undefined} size="lg" />
            <div>
              <h1 className="font-display text-xl font-bold text-text-primary">{user.fullName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{user.email}</span>
                {user.username && <span className="flex items-center gap-1"><AtSign className="h-3.5 w-3.5" />{user.username}</span>}
                {user.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{user.phone}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={ROLE_TONES[user.activeRole]}>{ROLE_LABELS[user.activeRole]}</Badge>
            {user.roles.filter((r) => r !== user.activeRole).map((role) => (
              <Badge key={role} variant="neutral">{ROLE_LABELS[role]}</Badge>
            ))}
            {user.emailVerifiedAt ? (
              <Badge variant="success" dot>Verified</Badge>
            ) : (
              <Badge variant="neutral">Unverified</Badge>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-muted">
          <span className="flex items-center gap-1"><Users2 className="h-3.5 w-3.5" />{user.roles.length > 1 ? `${user.roles.length} roles` : 'Single role'}</span>
          <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{user.countryCode}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{user.timezone}</span>
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Joined {formatDateTime(user.createdAt)}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Enrollments" value={user.enrollments.length} icon={BookOpen} tone="gold" />
        <StatCard label="Courses Taught" value={user.coursesTaught.length} icon={GraduationCap} tone="blue" />
        <StatCard label="Payments" value={user.counts.payments} icon={UserCheck} tone="emerald" />
        <StatCard label="Certificates" value={user.counts.certificates} icon={ShieldCheck} tone="brown" />
      </div>

      <SectionPanel title="Password Management" icon={Key}>
        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-line-soft/40 p-4">
            {!showPwd ? (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Eye className="h-4 w-4 text-gold-500" />
                <span>Password is hidden. Click &quot;Reset Password&quot; to set a new temporary password for this user.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-text-primary">Temporary password</span>
                  <div className="flex items-center gap-2">
                    <code className="rounded-md border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 font-mono text-sm font-bold text-gold-600 dark:text-gold-300">
                      {revealedPwd}
                    </code>
                    <button type="button" onClick={() => setShowPwd(false)} className="text-text-muted hover:text-text-primary" aria-label="Hide password">
                      <EyeOff className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-text-muted">Email:</span>
                  <span className="font-medium text-text-primary">{user.email}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={copyCredentials}>
                    <Copy className="h-4 w-4" /> Copy Credentials
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleRegenerate} disabled={pwdLoading}>
            {pwdLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Reset Password
          </Button>
          <p className="text-xs text-text-muted">
            Resetting revokes all of this user&apos;s active sessions and sets a new temporary password you can share with them.
          </p>
        </div>
      </SectionPanel>

      {(linkedAsStudent.length > 0 || linkedAsParent.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {linkedAsParent.length > 0 && (
            <SectionPanel title="Linked Students" icon={Users}>
              <ul className="divide-y divide-line">
                {linkedAsParent.map((link) => (
                  <li key={link.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{link.student.fullName}</p>
                      <p className="truncate text-xs text-text-muted">{link.student.email}</p>
                    </div>
                    <Badge variant="neutral">{RELATIONSHIP_LABELS[link.relationshipType] ?? link.relationshipType}</Badge>
                  </li>
                ))}
              </ul>
            </SectionPanel>
          )}
          {linkedAsStudent.length > 0 && (
            <SectionPanel title="Linked Parents / Guardians" icon={Users}>
              <ul className="divide-y divide-line">
                {linkedAsStudent.map((link) => (
                  <li key={link.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{link.parent.fullName}</p>
                      <p className="truncate text-xs text-text-muted">{link.parent.email}</p>
                    </div>
                    <Badge variant="neutral">{RELATIONSHIP_LABELS[link.relationshipType] ?? link.relationshipType}</Badge>
                  </li>
                ))}
              </ul>
            </SectionPanel>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionPanel title={user.enrollments.length ? `Enrollments (${user.enrollments.length})` : 'Enrollments'} icon={BookOpen}>
          {user.enrollments.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-muted">No enrollments yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {user.enrollments.map((enr) => (
                <li key={enr.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{enr.course.title}</p>
                    <p className="text-xs text-text-muted">{statusLabel(enr.status)} · {enr.createdAt?.slice(0, 10)}</p>
                  </div>
                  <Badge variant={enr.status === 'active' ? 'success' : enr.status === 'completed' ? 'gold' : 'neutral'}>
                    {statusLabel(enr.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>

        <SectionPanel title={user.coursesTaught.length ? `Courses Taught (${user.coursesTaught.length})` : 'Courses Taught'} icon={GraduationCap}>
          {user.coursesTaught.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-muted">No courses assigned.</p>
          ) : (
            <ul className="divide-y divide-line">
              {user.coursesTaught.map((course) => (
                <li key={course.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{course.title}</p>
                    <p className="text-xs text-text-muted">{course.subject} · {course.enrolledCount} enrolled</p>
                  </div>
                  <Badge variant={course.isPublished ? 'success' : 'neutral'}>{course.isPublished ? 'Published' : 'Draft'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>
      </div>

      <SectionPanel title="Recent Activity" icon={ShieldCheck}>
        {user.auditLogs.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">No recorded activity.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Event</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Detail</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">When</th>
                </tr>
              </thead>
              <tbody>
                {user.auditLogs.slice(0, 20).map((log) => (
                  <tr key={log.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2.5 font-medium text-text-primary">{activityLabel(log.action)}</td>
                    <td className="px-3 py-2.5 text-text-muted">{log.resourceType}{log.resourceId ? ` · ${log.resourceId.slice(0, 8)}…` : ''}</td>
                    <td className={cn('px-3 py-2.5 tabular-nums text-text-muted')}>{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionPanel>
    </div>
  );
}

function ButtonLinkHref({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="btn btn-outline">
      {children}
    </Link>
  );
}
