'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Certificate } from '@/types';
import { Button } from '@/components/ui/Button';
import { CertificateArt } from '@/components/certificate/CertificateArt';
import { CertificateActions } from '@/components/certificate/CertificateActions';
import { cn } from '@/lib/utils';

interface CourseOption {
  id: string;
  title: string;
}

interface StudentOption {
  id: string;
  fullName: string;
  email: string;
}

export function CertificateGenerator() {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [issued, setIssued] = useState<Certificate[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10));
  const [generated, setGenerated] = useState<Certificate | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/courses')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (!active) return;
        const list = Array.isArray(json.data) ? json.data : [];
        setCourses(list.map((c: CourseOption) => ({ id: c.id, title: c.title })));
        setSelectedCourse(list[0]?.id ?? '');
      })
      .catch(() => undefined);
    fetch('/api/users?role=student')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (!active) return;
        const list = Array.isArray(json.data) ? json.data : [];
        setStudents(list.map((s: StudentOption) => ({ id: s.id, fullName: s.fullName, email: s.email })));
        setSelectedUser(list.find((s: { roles?: string[] }) => s.roles?.includes('student'))?.id ?? list[0]?.id ?? '');
      })
      .catch(() => undefined);
    fetch('/api/certificates')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (active) setIssued(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const course = courses.find((c) => c.id === selectedCourse);
  const user = students.find((u) => u.id === selectedUser);

  const handleGenerate = useCallback(async () => {
    if (!course || !user) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          courseId: course.id,
          studentName: user.fullName,
          courseTitle: course.title,
          completionDate: new Date(completionDate).toISOString(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setGenerated(json.data);
        setIssued((prev) => [json.data, ...prev.filter((c) => c.id !== json.data.id)]);
      }
    } finally {
      setGenerating(false);
    }
  }, [course, user, completionDate]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        {generated && (
          <div className="space-y-4">
            <CertificateArt certificate={generated} />
            <CertificateActions
              certificate={generated}
              showSend
              showCopy
              showDownload
              showRevoke
              allowUnrevoke
            />
          </div>
        )}

        <div>
          <div className="mb-3">
            <h2 className="font-display text-sm font-semibold text-text-primary">Auto-Issued Certificates</h2>
            <p className="text-xs text-text-muted">
              Certificates are issued automatically when a course enrollment is marked completed.
            </p>
          </div>
          <div className="card divide-y divide-line">
            {issued.length > 0 ? (
              issued.map((cert) => (
                <button
                  key={cert.id}
                  onClick={() => setGenerated(cert)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-surface-soft',
                    generated?.id === cert.id && 'bg-gold-500/10',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{cert.studentName}</p>
                    <p className="truncate text-xs text-text-muted">{cert.courseTitle}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[11px] text-gold-600 dark:text-gold-400">{cert.verificationHash}</p>
                    <p className="text-[10px] text-text-muted">
                      {new Date(cert.issuedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <p className="px-4 py-6 text-center text-sm text-text-muted">No certificates issued yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card h-fit space-y-4 p-5">
        <div>
          <h2 className="font-display text-sm font-semibold text-text-primary">Issue Manually</h2>
          <p className="text-xs text-text-muted">Use the form to issue a certificate on demand.</p>
        </div>
        <div>
          <label htmlFor="cert-course" className="label">Course</label>
          <select
            id="cert-course"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="input !py-2"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cert-student" className="label">Student</label>
          <select
            id="cert-student"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="input !py-2"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.fullName} ({s.email})</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cert-date" className="label">Completion Date</label>
          <input
            id="cert-date"
            type="date"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            className="input !py-2"
          />
        </div>
        <Button variant="gold" onClick={handleGenerate} disabled={generating} fullWidth>
          {generating ? 'Generating...' : 'Generate Certificate'}
        </Button>
      </div>
    </div>
  );
}
