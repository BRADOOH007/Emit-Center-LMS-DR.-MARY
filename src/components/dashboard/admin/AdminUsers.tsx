'use client';

import { useEffect, useMemo, useState } from 'react';
import { MoreHorizontal, Search, ShieldCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, DataColumn, DataTable, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { Role, User } from '@/types';

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

export function AdminUsers({ scope }: { scope?: Role }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>(scope ?? 'all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [invite, setInvite] = useState({ name: '', email: '', role: 'student' as Role });

  const sendInvite = () => {
    if (!invite.name.trim() || !invite.email.trim()) return;
    setInviteOpen(false);
    setInviteSent(true);
    window.setTimeout(() => setInviteSent(false), 2000);
    setInvite({ name: '', email: '', role: 'student' });
  };

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/users')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!active) return;
        setUsers(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => {
        if (active) setUsers([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
          <UserAvatar name={user.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-text-primary">{user.fullName}</p>
            <p className="truncate text-xs text-text-muted">{user.email}</p>
          </div>
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

  return (
    <div className="space-y-6">
      <PageIntro
        kicker={`Admin · ${isScoped ? scopedLabel : 'Users'}`}
        title={isScoped ? `${scopedLabel}s` : 'User Management'}
        subtitle={
          isScoped
            ? `${rows.filter((u) => u.activeRole === scope).length} ${scopedLabel} accounts — invite, manage and monitor access`
            : `${rows.length} accounts across every role — invite, manage and monitor platform access`
        }
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <Users aria-hidden="true" className="h-4 w-4" /> Invite {isScoped ? scopedLabel : 'User'}
          </Button>
        }
      />

      {inviteSent && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Invitation sent to {invite.email || 'the user'}.
        </div>
      )}

      {inviteOpen && (
        <SectionPanel title={`Invite ${isScoped ? scopedLabel : 'User'}`} icon={Users}>
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
                onChange={(e) => setInvite({ ...invite, role: e.target.value as Role })}
              >
                <option value="student">Student</option>
                <option value="parent">Parent / Guardian</option>
                <option value="instructor">Instructor</option>
                <option value="administrator">Administrator</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={sendInvite}>Send Invite</Button>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
          </div>
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