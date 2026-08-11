import Image from 'next/image';
import { BadgeCheck, QrCode } from 'lucide-react';
import type { Certificate } from '@/types';
import { cn } from '@/lib/utils';

export function CertificateArt({
  certificate,
  tone = 'gold',
}: {
  certificate: Certificate;
  tone?: 'gold' | 'emerald';
}) {
  return (
    <div
      className={cn(
        'card overflow-hidden border-2',
        tone === 'gold' ? 'border-gold-500/30' : 'border-emerald-500/30',
      )}
    >
      <div className="relative p-8 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 20px)',
          }}
        />
        <div className="relative space-y-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold-500/30 bg-base-surface shadow-card">
              <Image
                src="/brand/emit-logo.png"
                alt="EMIT Center logo"
                width={52}
                height={52}
                className="h-12 w-12 object-contain"
              />
            </div>
            <span className="font-display text-lg font-bold text-gold-600 dark:text-gold-400">EMIT Center</span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-text-muted">Foundation · Learning Portal</span>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-text-muted">
            Certificate of Completion
          </p>
          <p className="font-display text-3xl font-bold text-text-primary">{certificate.studentName}</p>
          <div className="divider mx-auto max-w-xs" />
          <p className="text-sm text-text-muted">has successfully completed</p>
          <p className="px-8 font-display text-xl font-semibold text-gold-700 dark:text-gold-300">
            {certificate.courseTitle}
          </p>
          <p className="text-xs text-text-muted">
            Completed on{' '}
            {new Date(certificate.completionDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <div className="flex flex-col items-center">
              <QrCode aria-hidden="true" className="h-16 w-16 text-brown-800 dark:text-gold-300" />
              <p className="mt-1 text-[10px] text-text-muted">Verification QR</p>
            </div>
            <div className="text-left">
              <p className="text-[10px] text-text-muted">Verification Hash</p>
              <p className="font-mono text-xs font-semibold text-text-primary">{certificate.verificationHash}</p>
              <p className="text-[10px] text-text-muted">
                Issued{' '}
                {new Date(certificate.issuedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {tone === 'emerald' && (
            <p className="inline-flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />
              Verified issuer
            </p>
          )}
        </div>
      </div>
    </div>
  );
}