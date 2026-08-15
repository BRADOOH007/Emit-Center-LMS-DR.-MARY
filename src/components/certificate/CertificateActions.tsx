'use client';

import { useState } from 'react';
import { Ban, CheckCircle2, Copy, Download, ExternalLink, Loader2, Mail, RotateCcw, ShieldCheck } from 'lucide-react';
import type { Certificate } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { downloadCertificatePdf } from '@/lib/certificate-pdf';

export function CertificateActions({
  certificate,
  showSend = false,
  showDownload = true,
  showCopy = false,
  showRevoke = false,
  allowUnrevoke = true,
  onStatusChange,
}: {
  certificate: Certificate;
  showSend?: boolean;
  showDownload?: boolean;
  showCopy?: boolean;
  showRevoke?: boolean;
  allowUnrevoke?: boolean;
  onStatusChange?: (certificate: Certificate) => void;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [revoked, setRevoked] = useState(Boolean(certificate.revokedAt));

  const downloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadCertificatePdf(certificate);
    } catch {
      setSendError('Could not generate the PDF. Try the print dialog instead.');
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(certificate.verificationHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const sendEmail = async () => {
    setSending(true);
    setSendError('');
    setSent(false);
    try {
      const res = await fetch('/api/certificates/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateId: certificate.id }),
      });
      const json = await res.json();
      if (json.success) setSent(true);
      else setSendError(json.error ?? 'Failed to send.');
    } catch {
      setSendError('Network error while sending.');
    } finally {
      setSending(false);
    }
  };

  const toggleRevoke = async () => {
    if (toggling) return;
    setToggling(true);
    setSendError('');
    const next = !revoked;
    try {
      const res = await fetch('/api/certificates/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateId: certificate.id, revoked: next }),
      });
      const json = await res.json();
      if (json.success) {
        setRevoked(next);
        onStatusChange?.(json.data as Certificate);
      } else {
        setSendError(json.error ?? 'Failed to update certificate status.');
      }
    } catch {
      setSendError('Network error while updating certificate status.');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="no-print space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {showDownload && (
          <Button variant="gold" size="sm" onClick={downloadPdf} disabled={downloading}>
            {downloading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4" />}
            {downloading ? 'Preparing…' : 'Download PDF'}
          </Button>
        )}
        {showSend && (
          <Button variant="outline" size="sm" onClick={sendEmail} disabled={sending}>
            {sending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : sent ? <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-emerald-500" /> : <Mail aria-hidden="true" className="h-4 w-4" />}
            {sent ? 'Sent' : 'Send by Email'}
          </Button>
        )}
        {showCopy && (
          <Button variant="outline" size="sm" onClick={copyHash}>
            {copied ? <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-emerald-500" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy Hash'}
          </Button>
        )}
        {showRevoke && (
          <Button
            variant={revoked ? 'outline' : 'danger'}
            size="sm"
            onClick={toggleRevoke}
            disabled={toggling || (revoked && !allowUnrevoke)}
            title={revoked && !allowUnrevoke ? 'Only an administrator can restore a revoked certificate' : undefined}
          >
            {toggling ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : revoked ? <RotateCcw aria-hidden="true" className="h-4 w-4" /> : <Ban aria-hidden="true" className="h-4 w-4" />}
            {revoked ? 'Unrevoke' : 'Revoke'}
          </Button>
        )}
        <a
          href={`/certificate/${certificate.verificationHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline btn-sm"
        >
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          View Public Page
        </a>
        {revoked ? (
          <Badge variant="danger" dot>
            <Ban aria-hidden="true" className="h-3 w-3" />
            Revoked
          </Badge>
        ) : (
          <Badge variant="success" dot>
            <ShieldCheck aria-hidden="true" className="h-3 w-3" />
            Verifiable
          </Badge>
        )}
      </div>
      {sent && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Certificate sent to {certificate.studentName}&apos;s email and added to their notifications.
        </p>
      )}
      {sendError && <p className="text-xs text-red-600 dark:text-red-400">{sendError}</p>}
    </div>
  );
}