'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Download, FileBarChart2, FileCheck2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { CertificateActions } from '@/components/certificate/CertificateActions';
import type { Certificate } from '@/types';
import { useLocale } from '@/components/providers/AppProviders';
import { cn } from '@/lib/utils';

type Tab = 'compliance' | 'audit' | 'certificates';

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  createdAt: string;
  user?: { fullName: string; email: string } | null;
}

export function AdminReports() {
  const { formatDateTime } = useLocale();
  const [tab, setTab] = useState<Tab>('compliance');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditEntry[]>([]);

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
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/analytics')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: null })))
      .then((json) => {
        if (active) setRecentAudits(Array.isArray(json?.data?.recentAudits) ? json.data.recentAudits : []);
      })
      .catch(() => {
        if (active) setRecentAudits([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const exportCsv = () => {
    const header = tab === 'compliance'
      ? 'id,action,userId,resourceType,createdAt\n'
      : tab === 'audit'
        ? 'id,action,userId,resourceType,createdAt\n'
        : 'id,studentName,courseTitle,hash,completionDate\n';

    const body = tab === 'compliance'
      ? recentAudits.map((log) => [log.id, log.action, log.userId, log.resourceType, new Date(log.createdAt).toISOString()].join(',')).join('\n')
      : tab === 'audit'
        ? recentAudits.map((log) => [log.id, log.action, log.userId, log.resourceType, new Date(log.createdAt).toISOString()].join(',')).join('\n')
        : certificates.map((c) => [c.id, c.studentName, c.courseTitle, c.verificationHash, new Date(c.completionDate).toISOString()].join(',')).join('\n');

    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emit-${tab}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateCert = (updated: Certificate) => {
    setCertificates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Admin · Reports"
        title="Reports & Compliance"
        subtitle="FERPA access logs, audit trails, certificates issued, and data export requests."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="FERPA Access" value={0} hint="Recorded accesses" icon={ShieldAlert} tone="brown" />
        <StatCard label="Audit Events" value={recentAudits.length} hint="System activity" icon={FileBarChart2} tone="gold" />
        <StatCard label="Certificates" value={certificates.length} hint="Issued" icon={FileCheck2} tone="emerald" />
        <StatCard label="Data Exports" value={0} hint="Under GDPR" icon={BarChart3} tone="blue" />
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { value: 'compliance', label: 'Compliance Logs' },
          { value: 'audit', label: 'Audit Trail' },
          { value: 'certificates', label: 'Certificates' },
        ] as const).map((item) => (
          <button
            key={item.value}
            onClick={() => setTab(item.value)}
            className={cn('btn btn-sm', tab === item.value ? 'btn-gold' : 'btn-outline')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'compliance' && (
        <SectionPanel title="FERPA Access Logging" icon={ShieldAlert}>
          <div className="rounded-lg border border-line bg-surface-soft px-4 py-6 text-sm text-text-muted">
            <p className="font-medium text-text-primary">FERPA-protected access is logged server-side.</p>
            <p className="mt-2">
              Every time an instructor opens a student&apos;s gradebook or protected record, the action is recorded in
              the audit trail. There is no dedicated FERPA log endpoint — view recent protected-access events in the
              Audit Trail tab.
            </p>
          </div>
        </SectionPanel>
      )}

      {tab === 'audit' && (
        <SectionPanel title="Audit Trail" icon={FileBarChart2} actions={<Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-3.5 w-3.5" /> Export</Button>}>
          <ul className="divide-y divide-line">
            {recentAudits.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{log.action.replace('.', ' · ')}</p>
                  <p className="text-xs text-text-muted">User {log.user?.fullName ?? log.userId} · {log.resourceType}{log.resourceId ? ` · ${log.resourceId}` : ''}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-text-muted">{formatDateTime(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        </SectionPanel>
      )}

      {tab === 'certificates' && (
        <SectionPanel title="Issued Certificates" icon={FileCheck2}>
          <ul className="divide-y divide-line">
            {certificates.map((cert) => (
              <li key={cert.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{cert.studentName}</p>
                  <p className="text-xs text-text-muted">{cert.courseTitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-xs text-gold-600">{cert.verificationHash}</p>
                    <p className="text-[11px] text-text-muted">{formatDateTime(cert.completionDate)}</p>
                  </div>
                  <CertificateActions
                    certificate={cert}
                    showDownload
                    showSend
                    showRevoke
                    allowUnrevoke
                    onStatusChange={updateCert}
                  />
                </div>
              </li>
            ))}
          </ul>
        </SectionPanel>
      )}
    </div>
  );
}
