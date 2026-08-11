'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Download, FileBarChart2, FileCheck2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import {
  MOCK_ANALYTICS,
  MOCK_AUDIT_LOGS,
  MOCK_FERPA_LOGS,
  MOCK_DATA_EXPORT_REQUESTS,
} from '@/lib/mock-data';
import { getIssuedCertificates } from '@/lib/certificates';
import { useLocale } from '@/components/providers/AppProviders';
import { cn } from '@/lib/utils';

type Tab = 'compliance' | 'audit' | 'certificates';

export function AdminReports() {
  const { formatDateTime } = useLocale();
  const [tab, setTab] = useState<Tab>('compliance');

  const exportRequests = useMemo(() => MOCK_DATA_EXPORT_REQUESTS, []);
  const certificates = getIssuedCertificates();

  const exportCsv = () => {
    const header = tab === 'compliance'
      ? 'id,instructorId,resourceType,accessTime\n'
      : tab === 'audit'
        ? 'id,action,userId,resourceType,createdAt\n'
        : 'id,studentName,courseTitle,hash,completionDate\n';

    const body = tab === 'compliance'
      ? MOCK_FERPA_LOGS.map((log) => [log.id, log.instructorId, log.resourceType, new Date(log.accessedAt).toISOString()].join(',')).join('\n')
      : tab === 'audit'
        ? MOCK_AUDIT_LOGS.map((log) => [log.id, log.action, log.userId, log.resourceType, new Date(log.createdAt).toISOString()].join(',')).join('\n')
        : certificates.map((c) => [c.id, c.studentName, c.courseTitle, c.verificationHash, new Date(c.completionDate).toISOString()].join(',')).join('\n');

    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emit-${tab}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Admin · Reports"
        title="Reports & Compliance"
        subtitle="FERPA access logs, audit trails, certificates issued, and data export requests."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="FERPA Access" value={MOCK_FERPA_LOGS.length} hint="Recorded accesses" icon={ShieldAlert} tone="brown" />
        <StatCard label="Audit Events" value={MOCK_AUDIT_LOGS.length} hint="System activity" icon={FileBarChart2} tone="gold" />
        <StatCard label="Certificates" value={certificates.length} hint="Issued" icon={FileCheck2} tone="emerald" />
        <StatCard label="Data Exports" value={exportRequests.length} hint="Under GDPR" icon={BarChart3} tone="blue" />
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
        <SectionPanel title="FERPA Access Log" icon={ShieldAlert} actions={<Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-3.5 w-3.5" /> Export</Button>}>
          <ul className="divide-y divide-line">
            {MOCK_FERPA_LOGS.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">Instructor {log.instructorId} accessed {log.resourceType}</p>
                  <p className="text-xs text-text-muted">Student {log.studentId} · Course {log.courseId} · {log.ipAddress}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-text-muted">{formatDateTime(log.accessedAt)}</span>
              </li>
            ))}
          </ul>
        </SectionPanel>
      )}

      {tab === 'audit' && (
        <SectionPanel title="Audit Trail" icon={FileBarChart2} actions={<Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-3.5 w-3.5" /> Export</Button>}>
          <ul className="divide-y divide-line">
            {MOCK_AUDIT_LOGS.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{log.action.replace('.', ' · ')}</p>
                  <p className="text-xs text-text-muted">User {log.userId} · {log.resourceType}{log.resourceId ? ` · ${log.resourceId}` : ''}</p>
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
              <li key={cert.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{cert.studentName}</p>
                  <p className="text-xs text-text-muted">{cert.courseTitle}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-xs text-gold-600">{cert.verificationHash}</p>
                  <p className="text-[11px] text-text-muted">{formatDateTime(cert.completionDate)}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionPanel>
      )}
    </div>
  );
}