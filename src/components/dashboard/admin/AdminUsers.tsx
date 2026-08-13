'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal, Search, ShieldCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, DataColumn, DataTable, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { UserAvatar } from '@/components/ui/UserAvatar';
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
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>(scope ?? 'all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
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
    fetch('/api/users')
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
      setInviteMsg({ tone: 'error', text: 'Full name and email are required.' });
      return;
    }
    setSending(true);
    setInviteMsg(null);
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
        setInviteMsg({ tone: 'error', text: json.error || 'Unable to create account.' });
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
      const temp = json.data?.tempPassword
        ? ` ${invite.name.trim()} can sign in with the temporary password ${json.data.tempPassword}.`
        : '';
      setInviteMsg({
        tone: 'success',
        text: `${invite.role === 'student' ? 'Student' : ROLE_LABELS[invite.role]} account created for ${invite.email.trim()}.${temp}`,
      });
      window.setTimeout(() => setInviteMsg(null), 12000);
    } catch {
      setInviteMsg({ tone: 'error', text: 'Unable to create account. Please try again.' });
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
          <Link href={`/dashboard/admin/users/${user.id}`} className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <UserAvatar name={user.fullName} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-medium text-text-primary hover:text-gold-600 dark:hover:text-gold-400">{user.fullName}</p>
              <p className="truncate text-xs text-text-muted">{user.email}</p>
            </div>
          </Link>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Active Role',
      render: (user) => (
        <Badge variant={ROLE_TONES[user.activeRole]}>{user.activeRoleLabel}</Badge>
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
        <div className="relative">
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
              {['Reset password', 'Change role', 'Deactivate'].map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setMenuFor(null)}
                  className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-text-primary transition-colors hover:bg-line-soft"
                >
                  {action}
                </button>
              ))}
            </div>
          )}
        </div>
      ),
    },
  ];

  const isScoped = scope != null;
  const scopedLabel = scope ? ROLE_LABELS[scope] : '';
  const inviteRoles: Role[] = scope ? [scope] : ['student', 'parent', 'instructor', 'administrator'];

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

      {inviteMsg && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            inviteMsg.tone === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
          }`}
        >
          {inviteMsg.text}
        </div>
      )}

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
                with the temporary password <span className="font-mono">ChangeMe123!</span>.
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
            New accounts are verified automatically and sign in with the temporary password{' '}
            <span className="font-mono">ChangeMe123!</span>.
          </p>
        </SectionPanel>
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
        <DataTable rows={filtered} columns={columns} emptyMessage={loading ? 'Loading users…' : 'No users match your filters.'} />
      </SectionPanel>
    </div>
  );
}