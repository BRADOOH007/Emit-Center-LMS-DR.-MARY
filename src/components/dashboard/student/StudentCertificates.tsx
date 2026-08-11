'use client';

import { useMemo } from 'react';
import { Award, ExternalLink } from 'lucide-react';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { getStudentCertificates } from '@/lib/certificates';
import { useLocale } from '@/components/providers/AppProviders';
import { Badge } from '@/components/ui/Badge';

export function StudentCertificates({ studentId }: { studentId: string }) {
  const { formatDate } = useLocale();
  const certificates = useMemo(() => getStudentCertificates(studentId), [studentId]);

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Student · Certificates"
        title="My Certificates"
        subtitle="Certificates are generated automatically when you complete a course"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Certificates" value={certificates.length} hint="Earned credentials" icon={Award} tone="gold" />
        <StatCard label="Programs" value={new Set(certificates.map((c) => c.courseId)).size} hint="Courses completed" icon={Award} tone="emerald" />
        <StatCard label="Status" value={certificates.length > 0 ? 'Verified' : 'No certs yet'} hint="EMIT verification" icon={Award} tone="blue" />
      </div>

      <SectionPanel title="Certificate of Completion" icon={Award}>
        {certificates.length > 0 ? (
          <ul className="divide-y divide-line">
            {certificates.map((cert) => (
              <li key={cert.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-text-primary">{cert.courseTitle}</p>
                  <p className="text-xs text-text-muted">
                    Completed {formatDate(cert.completionDate)} · Issued {formatDate(cert.issuedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded-lg bg-line-soft px-2 py-1 text-xs font-semibold text-gold-600 dark:text-gold-400">
                    {cert.verificationHash}
                  </code>
                  <a
                    href={`/certificate/${cert.verificationHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                    View
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-10 text-center">
            <Award aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">
              No certificates yet. Complete a course and your certificate will appear here automatically.
            </p>
          </div>
        )}
      </SectionPanel>

      <div className="rounded-lg border border-line bg-surface-soft px-4 py-3 text-xs text-text-muted">
        <span className="font-semibold text-gold-600 dark:text-gold-400">EMIT Center Foundation</span> issues verifiable
        certificates with a unique hash. Anyone can confirm a certificate at{' '}
        <span className="font-mono">learn.emitcenter.com/certificate/&lt;hash&gt;</span>.
        <Badge variant="success" dot className="ml-2">Verifiable</Badge>
      </div>
    </div>
  );
}