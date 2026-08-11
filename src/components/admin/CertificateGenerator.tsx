'use client';

import { useCallback, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { MOCK_COURSES, MOCK_USERS } from '@/lib/mock-data';
import { getIssuedCertificates } from '@/lib/certificates';
import type { Certificate } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CertificateArt } from '@/components/certificate/CertificateArt';
import { cn } from '@/lib/utils';

export function CertificateGenerator() {
  const [selectedCourse, setSelectedCourse] = useState(MOCK_COURSES[0]?.id ?? '');
  const [selectedUser, setSelectedUser] = useState(MOCK_USERS.find((u) => u.roles.includes('student'))?.id ?? '');
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10));
  const [generated, setGenerated] = useState<Certificate | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const course = MOCK_COURSES.find((c) => c.id === selectedCourse);
  const user = MOCK_USERS.find((u) => u.id === selectedUser);
  const issued = getIssuedCertificates();

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
      if (json.success) setGenerated(json.data);
    } finally {
      setGenerating(false);
    }
  }, [course, user, completionDate]);

  const handleCopyHash = useCallback(() => {
    if (!generated) return;
    navigator.clipboard.writeText(generated.verificationHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generated]);

  const students = MOCK_USERS.filter((u) => u.roles.includes('student'));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        {generated && (
          <div className="space-y-4">
            <CertificateArt certificate={generated} />
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleCopyHash}>
                {copied ? (
                  <>
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy aria-hidden="true" className="h-4 w-4" />
                    Copy Hash
                  </>
                )}
              </Button>
              <a
                href={`/certificate/${generated.verificationHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
              >
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
                View Public Page
              </a>
              <Badge variant="success" dot>
                <ShieldCheck aria-hidden="true" className="h-3 w-3" />
                Verifiable
              </Badge>
            </div>
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
            {MOCK_COURSES.map((c) => (
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