'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Search, ShieldCheck, Users, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, DataColumn, DataTable, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useSession } from '@/components/providers/AppProviders';
import { useToast } from '@/components/ui/toast';
import type { RelationshipType, Role, User } from '@/types';

const ROLE_TONES: Record<Role, 'gold' | 'brown' | 'neutral' | 'success'> = {
  super_admin: 'gold',
  administrator: 'brown',
  instructor: 'neutral',
  student: 'success',
  parent: 'neutral',
};

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  administrator: 'Admin',
  instructor: 'Instructor',
  student: 'Student',
  parent: 'Parent',
};

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  guardian: 'Guardian',
  mother: 'Mother',
  father: 'Father',
  sponsor: 'Sponsor',
};

interface AdminCourseOption {
  id: string;
  title: string;
}

export function AdminUsers({ scope }: { scope?: Role }) {
  const { user: currentUser } = useSession();
  const isSuperAdmin = currentUser.roles.includes('super_admin');
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>(scope ?? 'all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roleEditor, setRoleEditor] = useState<{ user: User; roles: Role[] } | null>(null);
  const [savingRoles, setSavingRoles] = useState(false);
  const [invite, setInvite] = useState<{
    name: string;
    email: string;
    role: Role;
    parentEmail: string;
    parentFullName: string;
    relationshipType: RelationshipType;
    courseIds: string[];
  }>({
    name: '',
    email: '',
    role: scope ?? 'student',
    parentEmail: '',
    parentFullName: '',
    relationshipType: 'guardian',
    courseIds: [],
  });

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<AdminCourseOption[]>([]);

  const loadUsers = useCallback(() => {
    setLoading(true);
    fetch('/api/users', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setUsers(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => {
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!inviteOpen || invite.role !== 'instructor') return;
    fetch('/api/admin/courses')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => setCourses(Array.isArray(json.data) ? json.data.map((c: { id: string; title: string }) => ({ id: c.id, title: c.title })) : []))
      .catch(() => setCourses([]));
  }, [inviteOpen, invite.role]);

  const sendInvite = async () => {
    if (!invite.name.trim() || !invite.email.trim()) {
      toast.error('Missing information', 'Full name and email are required.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: invite.name.trim(),
          email: invite.email.trim(),
          role: invite.role,
          ...(invite.role === 'instructor' && invite.courseIds.length ? { courseIds: invite.courseIds } : {}),
          ...(invite.role === 'student'
            ? {
                parentEmail: invite.parentEmail.trim() || undefined,
                parentFullName: invite.parentFullName.trim() || undefined,
                relationshipType: invite.relationshipType,
              }
            : {}),
        }),
      });
      const json = await res.json().catch(() => ({ success: false, error: 'Server error' }));
      if (!res.ok || !json.success) {
        toast.error('Unable to create account', json.error);
        return;
      }
      setInviteOpen(false);
      setInvite({
        name: '',
        email: '',
        role: scope ?? 'student',
        parentEmail: '',
        parentFullName: '',
        relationshipType: 'guardian',
        courseIds: [],
      });
      loadUsers();
      const d = json.data;
      const roleLabel = invite.role === 'student' ? 'Student' : ROLE_LABELS[invite.role];
      const credentials = [d?.username && `Username: ${d.username}`, d?.tempPassword && `Password: ${d.tempPassword}`]
        .filter(Boolean)
        .join(' · ');
      const parentPart =
        d?.parentUsername && d?.parentPassword
          ? ` Parent account: ${d.parentUsername} / ${d.parentPassword}.`
          : d?.parentUsername
            ? ` Linked to existing parent ${d.parentUsername}.`
            : '';
      toast.success(
        `${roleLabel} account created for ${invite.email.trim()}`,
        [credentials, parentPart].filter(Boolean).join(' · ') || undefined,
      );
    } catch {
      toast.error('Unable to create account', 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const toggleCourse = (id: string) => {
    setInvite((prev) => ({
      ...prev,
      courseIds: prev.courseIds.includes(id) ? prev.courseIds.filter((c) => c !== id) : [...prev.courseIds, id],
    }));
  };

  const handleResetPassword = async (user: User) => {
    setMenuFor(null);
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/password`, { method: 'POST' });
      const json = await res.json().catch(() => ({ success: false, error: 'Server error' }));
      if (!res.ok || !json.success) {
        toast.error('Failed to reset password', json.error);
        return;
      }
      toast.success('Password reset', `New temporary password: ${json.data.password}. All active sessions were revoked.`);
    } catch {
      toast.error('Failed to reset password', 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleStatus = async (user: User) => {
    setMenuFor(null);
    const deactivating = user.status !== 'deactivated';
    if (deactivating && !confirm(`Deactivate ${user.fullName}? They will be signed out immediately and blocked from signing in until reactivated.`)) return;
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: deactivating ? 'deactivated' : 'active' }),
      });
      const json = await res.json().catch(() => ({ success: false, error: 'Server error' }));
      if (!res.ok || !json.success) {
        toast.error('Failed to update status', json.error);
        return;
      }
      toast.success(deactivating ? 'Account deactivated' : 'Account reactivated', deactivating ? `${user.fullName} was signed out and can no longer sign in.` : `${user.fullName} can sign in again.`);
      loadUsers();
    } catch {
      toast.error('Failed to update status', 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const openRoleEditor = (user: User) => {
    setMenuFor(null);
    setRoleEditor({ user, roles: [...user.roles] });
  };

  const toggleRoleFor = (role: Role) => {
    setRoleEditor((prev) => {
      if (!prev) return prev;
      const has = prev.roles.includes(role);
      const roles = has ? prev.roles.filter((r) => r !== role) : [...prev.roles, role];
      return { ...prev, roles };
    });
  };

  const saveRoles = async () => {
    if (!roleEditor) return;
    if (roleEditor.roles.length === 0) {
      toast.error('At least one role required', 'A user must keep at least one role.');
      return;
    }
    setSavingRoles(true);
    try {
      const activeRole = roleEditor.roles.includes(roleEditor.user.activeRole) ? roleEditor.user.activeRole : roleEditor.roles[0];
      const res = await fetch(`/api/admin/users/${roleEditor.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: roleEditor.roles, activeRole }),
      });
      const json = await res.json().catch(() => ({ success: false, error: 'Server error' }));
      if (!res.ok || !json.success) {
        toast.error('Failed to change roles', json.error);
        return;
      }
      toast.success('Roles updated', `${roleEditor.user.fullName}'s roles were updated.`);
      setRoleEditor(null);
      loadUsers();
    } catch {
      toast.error('Failed to change roles', 'Please try again.');
    } finally {
      setSavingRoles(false);
    }
  };

  const rows = useMemo(() => users.map((u) => ({ ...u, activeRoleLabel: ROLE_LABELS[u.activeRole] })), [users]);

  const filtered = rows.filter((u) => {
    if (scope && u.activeRole !== scope) return false;
    const q = search.toLowerCase();
    const matchesSearch = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesRole = roleFilter === 'all' || u.activeRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  const columns: DataColumn<User & { activeRoleLabel: string }>[] = [
    {
      key: 'user',
      header: 'User',
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <UserAvatar name={user.fullName} src={user.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-medium text-text-primary">{user.fullName}</p>
              <p className="truncate text-xs text-text-muted">{user.email}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Active Role',
      render: (user) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={ROLE_TONES[user.activeRole]}>{user.activeRoleLabel}</Badge>
          {user.status === 'deactivated' && <Badge variant="danger">Deactivated</Badge>}
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'All Roles',
      render: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.map((role) => (
            <Badge key={role} variant="neutral">{ROLE_LABELS[role]}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (user) => <span className="text-sm text-text-primary">{user.countryCode} · {user.timeZone}</span>,
    },
    {
      key: 'created',
      header: 'Member Since',
      render: (user) => <span className="text-sm tabular-nums text-text-muted">{user.createdAt?.slice(0, 10)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (user) => (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" aria-label="More options" onClick={() => setMenuFor(menuFor === user.id ? null : user.id)}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {menuFor === user.id && (
            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-line bg-base-surface p-1 shadow-lg">
              <Link
                href={`/dashboard/admin/users/${user.id}`}
                onClick={() => setMenuFor(null)}
                className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-text-primary transition-colors hover:bg-line-soft"
              >
                View profile
              </Link>
              <button
                type="button"
                onClick={() => handleResetPassword(user)}
                disabled={busyId === user.id}
                className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-text-primary transition-colors hover:bg-line-soft disabled:opacity-60"
              >
                {busyId === user.id ? 'Working…' : 'Reset password'}
              </button>
              <button
                type="button"
                onClick={() => openRoleEditor(user)}
                className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-text-primary transition-colors hover:bg-line-soft"
              >
                Change role
              </button>
              {user.status === 'deactivated' ? (
                <button
                  type="button"
                  onClick={() => handleToggleStatus(user)}
                  disabled={busyId === user.id || currentUser.id === user.id}
                  className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-emerald-600 transition-colors hover:bg-line-soft disabled:opacity-60 dark:text-emerald-400"
                >
                  {busyId === user.id ? 'Working…' : 'Reactivate'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleStatus(user)}
                  disabled={busyId === user.id || currentUser.id === user.id || user.roles.includes('super_admin')}
                  className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-red-600 transition-colors hover:bg-line-soft disabled:opacity-60 dark:text-red-400"
                >
                  {busyId === user.id ? 'Working…' : 'Deactivate'}
                </button>
              )}
            </div>
          )}
        </div>
      ),
    },
  ];

  const isScoped = scope != null;
  const scopedLabel = scope ? ROLE_LABELS[scope] : '';
  const inviteRoles: Role[] = scope
    ? [scope]
    : isSuperAdmin
      ? ['student', 'parent', 'instructor', 'administrator']
      : ['student', 'parent', 'instructor'];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker={`Admin · ${isScoped ? scopedLabel : 'Users'}`}
        title={isScoped ? `${scopedLabel}s` : 'User Management'}
        subtitle={
          isScoped
            ? `${rows.filter((u) => u.activeRole === scope).length} ${scopedLabel} accounts — create, manage and monitor access`
            : `${rows.length} accounts across every role — create, manage and monitor platform access`
        }
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <Users aria-hidden="true" className="h-4 w-4" /> Create {isScoped ? scopedLabel : 'User'}
          </Button>
        }
      />

      {inviteOpen && (
        <SectionPanel title={`Create ${isScoped ? scopedLabel : 'User'} Account`} icon={Users}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="invite-name">Full name</label>
              <input
                id="invite-name"
                className="input"
                value={invite.name}
                onChange={(e) => setInvite({ ...invite, name: e.target.value })}
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div>
              <label className="label" htmlFor="invite-email">Email address</label>
              <input
                id="invite-email"
                type="email"
                className="input"
                value={invite.email}
                onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="label" htmlFor="invite-role">Role</label>
              <select
                id="invite-role"
                className="input"
                value={invite.role}
                onChange={(e) =>
                  setInvite({ ...invite, role: e.target.value as Role, relationshipType: 'guardian', courseIds: [] })
                }
              >
                {inviteRoles.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
            </div>
          </div>

          {invite.role === 'student' && (
            <div className="mt-4 rounded-lg border border-line bg-line-soft/40 p-4">
              <p className="mb-3 text-sm font-medium text-text-primary">Parent / Guardian (optional)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="invite-parent-name">Parent / guardian name</label>
                  <input
                    id="invite-parent-name"
                    className="input"
                    value={invite.parentFullName}
                    onChange={(e) => setInvite({ ...invite, parentFullName: e.target.value })}
                    placeholder="e.g. Mary Doe"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="invite-parent-email">Parent / guardian email</label>
                  <input
                    id="invite-parent-email"
                    type="email"
                    className="input"
                    value={invite.parentEmail}
                    onChange={(e) => setInvite({ ...invite, parentEmail: e.target.value })}
                    placeholder="parent@example.com"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="invite-relationship">Relationship</label>
                  <select
                    id="invite-relationship"
                    className="input"
                    value={invite.relationshipType}
                    onChange={(e) => setInvite({ ...invite, relationshipType: e.target.value as RelationshipType })}
                  >
                    {(Object.keys(RELATIONSHIP_LABELS) as RelationshipType[]).map((rt) => (
                      <option key={rt} value={rt}>{RELATIONSHIP_LABELS[rt]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="mt-2 text-xs text-text-muted">
                Providing an email creates a parent account (if none exists) and links it to this student. Parents sign in
                with a generated temporary password.
              </p>
            </div>
          )}

          {invite.role === 'instructor' && (
            <div className="mt-4 rounded-lg border border-line bg-line-soft/40 p-4">
              <p className="mb-3 text-sm font-medium text-text-primary">Assign courses (optional)</p>
              <p className="mb-2 text-xs text-text-muted">Select the courses this instructor will teach.</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {courses.length === 0 && (
                  <p className="text-sm text-text-muted">No courses created yet.</p>
                )}
                {courses.map((course) => (
                  <label key={course.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-line"
                      checked={invite.courseIds.includes(course.id)}
                      onChange={() => toggleCourse(course.id)}
                    />
                    <span className="truncate text-text-primary">{course.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Button onClick={sendInvite} disabled={sending}>{sending ? 'Creating…' : 'Create Account'}</Button>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
          </div>
          <p className="mt-3 text-xs text-text-muted">
            New accounts are verified automatically and sign in with a generated temporary password.
          </p>
        </SectionPanel>
      )}

      {roleEditor && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Change user roles"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div aria-hidden="true" onClick={() => setRoleEditor(null)} className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md animate-scale-in rounded-card border border-line bg-base-elevated p-5 shadow-pop">
            <h3 className="font-display text-lg font-semibold text-text-primary">Change roles</h3>
            <p className="mt-1 text-sm text-text-muted">{roleEditor.user.fullName} · {roleEditor.user.email}</p>
            <div className="mt-4 space-y-2">
              {((isSuperAdmin
                ? ['student', 'parent', 'instructor', 'administrator', 'super_admin']
                : ['student', 'parent', 'instructor', 'administrator']) as Role[]).map((role) => (
                <label key={role} className="flex cursor-pointer items-center justify-between rounded-lg border border-line px-4 py-2.5 text-sm">
                  <span className="font-medium text-text-primary">{ROLE_LABELS[role]}</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-line"
                    checked={roleEditor.roles.includes(role)}
                    onChange={() => toggleRoleFor(role)}
                    disabled={role === 'super_admin' && !isSuperAdmin}
                  />
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-muted">
              The active role updates automatically if the current one is removed. The super admin role can only be granted by a super admin.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <Button onClick={saveRoles} disabled={savingRoles}>
                {savingRoles && <Loader2 className="h-4 w-4 animate-spin" />} Save roles
              </Button>
              <Button variant="outline" onClick={() => setRoleEditor(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={rows.length} hint="All accounts" icon={Users} tone="gold" />
        <StatCard label="Students" value={rows.filter((u) => u.roles.includes('student')).length} hint="Learners" icon={Users} tone="emerald" />
        <StatCard label="Instructors" value={rows.filter((u) => u.roles.includes('instructor')).length} hint="Teaching faculty" icon={Users} tone="blue" />
        <StatCard label="Admins" value={rows.filter((u) => u.roles.includes('super_admin') || u.roles.includes('administrator')).length} hint="Platform staff" icon={ShieldCheck} tone="brown" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="input pl-9"
            aria-label="Search users"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(scope ? [scope] : ['all', 'student', 'instructor', 'parent', 'administrator', 'super_admin'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`btn btn-sm ${roleFilter === role ? 'btn-gold' : 'btn-outline'}`}
            >
              {role === 'all' ? 'All' : ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      </div>

      <SectionPanel>
        <DataTable
          rows={filtered}
          columns={columns}
          onRowClick={(user) => router.push(`/dashboard/admin/users/${user.id}`)}
          emptyMessage={loading ? 'Loading users…' : 'No users match your filters.'}
        />
      </SectionPanel>
    </div>
  );
}