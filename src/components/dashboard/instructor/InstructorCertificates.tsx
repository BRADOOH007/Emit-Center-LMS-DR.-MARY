'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, ExternalLink, Search } from 'lucide-react';
import { PageIntro, DataColumn, DataTable, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { Badge } from '@/components/ui/Badge';
import { CertificateActions } from '@/components/certificate/CertificateActions';
import { useLocale } from '@/components/providers/AppProviders';
import type { Certificate } from '@/types';

export function InstructorCertificates({ instructorId }: { instructorId: string }) {
  const { formatDate } = useLocale();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/certificates')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (active) setCertificates(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => {
        if (active) setCertificates([]);
      });
    return () => {
      active = false;
    };
  }, [instructorId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return certificates.filter(
      (c) =>
        c.studentName.toLowerCase().includes(q) ||
        c.courseTitle.toLowerCase().includes(q) ||
        c.verificationHash.toLowerCase().includes(q),
    );
  }, [certificates, search]);

  const updateCert = (updated: Certificate) => {
    setCertificates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const columns: DataColumn<Certificate>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (cert) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary">{cert.studentName}</p>
          <p className="text-xs text-text-muted">{cert.courseTitle}</p>
        </div>
      ),
    },
    {
      key: 'issued',
      header: 'Issued',
      render: (cert) => <span className="text-sm text-text-primary">{formatDate(cert.issuedAt)}</span>,
    },
    {
      key: 'hash',
      header: 'Verification',
      render: (cert) => <code className="font-mono text-xs text-gold-600 dark:text-gold-400">{cert.verificationHash}</code>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (cert) =>
        cert.revokedAt ? (
          <Badge variant="danger">Revoked</Badge>
        ) : (
          <Badge variant="success" dot>Active</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (cert) => (
        <CertificateActions
          certificate={cert}
          showSend
          showDownload
          showRevoke
          allowUnrevoke={false}
          onStatusChange={updateCert}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Instructor · Certificates"
        title="Student Certificates"
        subtitle={`${certificates.length} certificate${certificates.length === 1 ? '' : 's'} issued to students in your courses`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Certificates" value={certificates.length} hint="Issued to your students" icon={Award} tone="gold" />
        <StatCard label="Active" value={certificates.filter((c) => !c.revokedAt).length} hint="Currently verifiable" icon={Award} tone="emerald" />
        <StatCard label="Revoked" value={certificates.filter((c) => c.revokedAt).length} hint="No longer valid" icon={Award} tone="red" />
      </div>

      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students, courses or hash…"
          className="input pl-9"
          aria-label="Search certificates"
        />
      </div>

      <SectionPanel>
        <DataTable
          rows={filtered}
          columns={columns}
          emptyMessage="No certificates issued for students in your courses yet."
        />
      </SectionPanel>

      <p className="flex items-center gap-1.5 text-xs text-text-muted">
        <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
        Certificates are issued automatically when a course is completed, or on demand by an administrator.
      </p>
    </div>
  );
}