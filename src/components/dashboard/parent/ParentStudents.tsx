'use client';

import { useMemo, useState } from 'react';
import { UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { getLinkedStudentIds } from '@/lib/dashboard-data';
import { MOCK_USERS } from '@/lib/mock-data';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { User } from '@/types';

export function ParentStudents({ parentId }: { parentId: string }) {
  const studentIds = useMemo(() => getLinkedStudentIds(parentId), [parentId]);
  const [students, setStudents] = useState<User[]>(() => MOCK_USERS.filter((u) => studentIds.includes(u.id)));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [code, setCode] = useState('');
  const [pendingCode, setPendingCode] = useState('');

  const linkStudent = () => {
    if (!code.trim()) return;
    setPendingCode(code.trim());
    setCode('');
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Parent · Students"
        title="Linked Students"
        subtitle={`${students.length} ${students.length === 1 ? 'student is' : 'students are'} linked to your guardian account`}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <UserRound aria-hidden="true" className="h-4 w-4" /> Link a Student
          </Button>
        }
      />

      {pendingCode && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Link request for code <span className="font-mono font-semibold">{pendingCode}</span> submitted — the student will appear here once approved.
        </div>
      )}

      {dialogOpen && (
        <SectionPanel title="Link a Student" icon={UserRound}>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="link-code">Student link code</label>
              <input
                id="link-code"
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. EMIT-LINK-XXXX"
              />
              <p className="mt-1 text-xs text-text-muted">The student can find this code under their profile → Sharing.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={linkStudent}>Send Request</Button>
              <Button variant="outline" onClick={() => { setDialogOpen(false); setCode(''); }}>Cancel</Button>
            </div>
          </div>
        </SectionPanel>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Linked Students" value={students.length} hint="Guardian connections" icon={UserRound} tone="gold" />
        <StatCard label="Guardian" value="Primary" hint="Your role" icon={UserRound} tone="blue" />
        <StatCard label="Status" value="Active" hint="All links active" icon={UserRound} tone="emerald" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {students.map((student) => (
          <article key={student.id} className="card p-5">
            <div className="flex items-center gap-4">
              <UserAvatar name={student.fullName} size="lg" />
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold text-text-primary">{student.fullName}</h2>
                <p className="text-sm text-text-muted">{student.email}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="success">Linked</Badge>
              <Badge variant="neutral">Student</Badge>
              <Badge variant="neutral">{student.countryCode}</Badge>
            </div>
            <div className="mt-4 flex gap-2 border-t border-line pt-4">
              <a href="/dashboard/parent/grades" className="btn btn-outline btn-sm">Grades</a>
              <a href="/dashboard/parent/reports" className="btn btn-outline btn-sm">Reports</a>
              <a href="/dashboard/parent/schedule" className="btn btn-outline btn-sm">Schedule</a>
            </div>
          </article>
        ))}
      </div>

      {students.length === 0 && (
        <SectionPanel className="py-16 text-center">
          <p className="text-sm text-text-muted">No students linked yet. Use “Link a Student” to connect a profile.</p>
        </SectionPanel>
      )}
    </div>
  );
}