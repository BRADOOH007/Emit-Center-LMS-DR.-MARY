'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale, useSession } from '@/components/providers/AppProviders';
import { downloadCertificatePdf } from '@/lib/certificate-pdf';
import type { Certificate } from '@/types';

type StudentPlaceholder = { id: string; fullName: string };

export function ParentCertificates({ parentId }: { parentId: string }) {
  const { formatDate } = useLocale();
  const { user } = useSession();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const links: { student?: StudentPlaceholder | null }[] = await fetch(`/api/users/${encodeURIComponent(user.id)}/linked-students`)
        .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
        .then((json) => (Array.isArray(json.data) ? json.data : []));
      const studentList: StudentPlaceholder[] = links
        .map((link) => link.student)
        .filter((s): s is StudentPlaceholder => Boolean(s));

      const rows = await Promise.all(
        studentList.map((student) =>
          fetch(`/api/certificates?userId=${encodeURIComponent(student.id)}`)
            .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
            .then((json) => (Array.isArray(json.data) ? json.data : [])),
        ),
      );

      if (!active) return;
      setStudentCount(studentList.length);
      setCertificates(rows.flat());
    }

    load();
    return () => {
      active = false;
    };
  }, [user.id, parentId]);

  const activeCerts = useMemo(() => certificates.filter((c) => !c.revokedAt), [certificates]);
  const revokedCerts = useMemo(() => certificates.filter((c) => c.revokedAt), [certificates]);

  const handleDownload = async (cert: Certificate) => {
    if (downloadingId) return;
    setDownloadingId(cert.id);
    try {
      await downloadCertificatePdf(cert);
    } catch {
      window.print();
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Parent · Certificates"
        title="Student Certificates"
        subtitle="Download certificates earned by your linked students"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Certificates" value={certificates.length} hint="Across linked students" icon={Award} tone="gold" />
        <StatCard label="Active" value={activeCerts.length} hint="Currently valid" icon={Award} tone="emerald" />
        <StatCard label="Revoked" value={revokedCerts.length} hint="No longer valid" icon={Award} tone="red" />
      </div>

      {certificates.length > 0 ? (
        certificates.map((cert) => (
          <SectionPanel key={cert.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-text-primary">{cert.studentName}</p>
                <p className="truncate text-sm text-text-muted">{cert.courseTitle}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Completed {formatDate(cert.completionDate)} · Issued {formatDate(cert.issuedAt)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="rounded-lg bg-line-soft px-2 py-1 text-xs font-semibold text-gold-600 dark:text-gold-400">
                    {cert.verificationHash}
                  </code>
                  {cert.revokedAt ? (
                    <Badge variant="danger">Revoked</Badge>
                  ) : (
                    <Badge variant="success" dot>Active</Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/certificate/${cert.verificationHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                  View
                </a>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => handleDownload(cert)}
                  disabled={downloadingId === cert.id || Boolean(cert.revokedAt)}
                >
                  {downloadingId === cert.id ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <Download aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  {downloadingId === cert.id ? 'Preparing…' : 'Download'}
                </Button>
              </div>
            </div>
          </SectionPanel>
        ))
      ) : (
        <SectionPanel className="py-16 text-center">
          <Award aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-text-muted" />
          <p className="text-sm text-text-muted">
            {studentCount === 0
              ? 'No students linked yet. Link a student to see their certificates.'
              : 'No certificates earned by your linked students yet.'}
          </p>
        </SectionPanel>
      )}
    </div>
  );
}