'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Lock,
  Mail,
  ShieldCheck,
  Trash2,
  UserX,
} from 'lucide-react';
import type {
  AccountDeletionRequest,
  ConsentRecord,
  DataExportRequest,
} from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function PrivacySettings({ userId }: { userId: string }) {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exportResult, setExportResult] = useState<{ downloadUrl?: string } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [deletionResult, setDeletionResult] = useState<{ status?: string; gracePeriodEnd?: string } | null>(null);
  const [deletionLoading, setDeletionLoading] = useState(false);
  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);
  const [exportHistory, setExportHistory] = useState<DataExportRequest[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<AccountDeletionRequest[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`/api/compliance/consent/${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (active) setConsentRecords(Array.isArray(json.data) ? (json.data as ConsentRecord[]) : []);
      })
      .catch(() => {
        if (active) setConsentRecords([]);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    let active = true;
    fetch('/api/compliance/data-export')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (active) setExportHistory(Array.isArray(json.data) ? (json.data as DataExportRequest[]) : []);
      })
      .catch(() => {
        if (active) setExportHistory([]);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    let active = true;
    fetch('/api/compliance/account-deletion')
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (active) setDeletionRequests(Array.isArray(json.data) ? (json.data as AccountDeletionRequest[]) : []);
      })
      .catch(() => {
        if (active) setDeletionRequests([]);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const deletionRequest = deletionRequests.find(
    (r) => r.status === 'pending' || r.status === 'grace_period',
  );

  const handleExport = useCallback(async () => {
    setExportLoading(true);
    try {
      const res = await fetch('/api/compliance/data-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, format: exportFormat }),
      });
      const json = await res.json();
      if (json.success) {
        setExportResult(json.data);
        setExportHistory((prev) => [json.data, ...prev]);
      }
    } finally {
      setExportLoading(false);
    }
  }, [userId, exportFormat]);

  const handleDeletionRequest = useCallback(async () => {
    setDeletionLoading(true);
    try {
      const res = await fetch('/api/compliance/account-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason: deletionReason }),
      });
      const json = await res.json();
      if (json.success) {
        setDeletionResult(json.data);
        setDeletionRequests((prev) => [json.data, ...prev]);
      }
    } finally {
      setDeletionLoading(false);
    }
  }, [userId, deletionReason]);

  return (
    <div className="space-y-8">
      <div className="panel space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          <ShieldCheck aria-hidden="true" className="h-5 w-5 text-gold-600 dark:text-gold-400" />
          Consent & Compliance Status
        </h2>
        <div className="divider" />
        <div className="space-y-2">
          {consentRecords.length === 0 && (
            <p className="text-sm text-text-muted">No consent records found.</p>
          )}
          {consentRecords.map((record) => (
            <div key={record.id} className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {record.type === 'coppa' && 'COPPA — Under-13 Parental Consent'}
                  {record.type === 'gdpr_data' && 'GDPR — Data Processing Consent'}
                  {record.type === 'gdpr_marketing' && 'GDPR — Marketing Consent'}
                  {record.type === 'tos' && 'Terms of Service'}
                </p>
                {record.parentEmail && (
                  <p className="text-xs text-text-muted">Parent: {record.parentEmail}</p>
                )}
              </div>
              <Badge
                variant={
                  record.status === 'verified' ? 'success' :
                  record.status === 'pending' ? 'gold' : 'danger'
                }
                dot
              >
                {record.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="panel space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          <Download aria-hidden="true" className="h-5 w-5 text-gold-600 dark:text-gold-400" />
          Data Export (GDPR Article 20)
        </h2>
        <p className="text-sm text-text-muted">
          Download a portable copy of your personal data in machine-readable format.
        </p>
        <div className="divider" />
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="json"
              checked={exportFormat === 'json'}
              onChange={() => setExportFormat('json')}
              className="accent-gold-600"
            />
            <span className="text-sm text-text-primary">JSON</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="csv"
              checked={exportFormat === 'csv'}
              onChange={() => setExportFormat('csv')}
              className="accent-gold-600"
            />
            <span className="text-sm text-text-primary">CSV</span>
          </label>
          <Button variant="gold" size="sm" onClick={handleExport} disabled={exportLoading}>
            {exportLoading ? 'Exporting...' : 'Request Export'}
          </Button>
        </div>

        {exportResult && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-500" />
              <p className="text-sm font-semibold text-text-primary">Export ready</p>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Your data export is available for download (expires in 7 days).
            </p>
            {exportResult.downloadUrl && (
              <a href={exportResult.downloadUrl} className="btn btn-gold btn-sm mt-2" download>
                <Download aria-hidden="true" className="h-4 w-4" />
                Download {exportFormat.toUpperCase()}
              </a>
            )}
          </div>
        )}

        {exportHistory.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold text-text-muted">Export History</p>
            {exportHistory.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between rounded-lg bg-line-soft/50 px-3 py-2 text-xs">
                <span className="text-text-primary">{exp.format.toUpperCase()} — {new Date(exp.requestedAt).toLocaleDateString()}</span>
                <Badge variant={exp.status === 'completed' ? 'success' : 'neutral'}>{exp.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 border border-red-500/20 bg-red-500/5 px-0 py-0">
        <div className="panel space-y-4 border-red-500/20 bg-transparent">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-red-600 dark:text-red-400">
            <Trash2 aria-hidden="true" className="h-5 w-5" />
            Account Deletion (GDPR Article 17)
          </h2>
          <p className="text-sm text-text-muted">
            Request permanent deletion of your account and all associated personal data.
            A 30-day grace period applies before permanent removal. You may cancel at any time during this period.
          </p>
          <div className="divider" />

          {deletionRequest ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 dark:bg-amber-500/20">
                <Clock aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Deletion in progress</p>
                  <p className="text-xs text-text-muted">
                    Your account is scheduled for permanent deletion on{' '}
                    {new Date(deletionRequest.gracePeriodEnd).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                    . You may cancel this request at any time before that date.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="danger" size="sm">
                  <UserX aria-hidden="true" className="h-4 w-4" />
                  Cancel Deletion
                </Button>
              </div>
            </div>
          ) : deletionResult ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3">
                <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Deletion scheduled</p>
                  <p className="text-xs text-text-muted">
                    Grace period ends:{' '}
                    {deletionResult.gracePeriodEnd ? new Date(deletionResult.gracePeriodEnd).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    }) : '30-day period'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="deletion-reason" className="label">Reason (optional)</label>
                <textarea
                  id="deletion-reason"
                  rows={3}
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  className="input !py-2"
                  placeholder="Help us improve by sharing your reason for leaving..."
                />
              </div>
              <Button
                variant="danger"
                onClick={handleDeletionRequest}
                disabled={deletionLoading}
              >
                {deletionLoading ? 'Requesting...' : 'Request Account Deletion'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CoppAVerificationBanner({ userId }: { userId: string }) {
  const [records, setRecords] = useState<ConsentRecord[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`/api/compliance/consent/${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
      .then((json) => {
        if (active) setRecords(Array.isArray(json.data) ? (json.data as ConsentRecord[]) : []);
      })
      .catch(() => {
        if (active) setRecords([]);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const coppaRecord = records.find((r) => r.userId === userId && r.type === 'coppa');
  if (!coppaRecord || coppaRecord.status === 'verified') return null;

  return (
    <div className="flex items-center justify-between rounded-panel border border-amber-500/30 bg-amber-500/5 px-4 py-3 dark:bg-amber-500/20">
      <div className="flex items-center gap-3">
        <Lock aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-text-primary">Parental Consent Required</p>
          <p className="text-xs text-text-muted">
            COPPA requires verified parental consent for users under 13. A verification email has been sent to{' '}
            <span className="font-medium text-text-primary">{coppaRecord.parentEmail}</span>.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="gold">{coppaRecord.status}</Badge>
        <span className="flex items-center gap-1 text-xs text-gold-600 dark:text-gold-400">
          <Mail aria-hidden="true" className="h-3.5 w-3.5" />
          Resend
        </span>
      </div>
    </div>
  );
}
