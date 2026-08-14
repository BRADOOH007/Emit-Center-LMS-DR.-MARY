'use client';

import Image from 'next/image';
import { BadgeCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Certificate } from '@/types';
import { cn } from '@/lib/utils';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export function CertificateArt({
  certificate,
  tone = 'gold',
}: {
  certificate: Certificate;
  tone?: 'gold' | 'emerald';
}) {
  const verifyUrl = `${APP_URL}/certificate/${certificate.verificationHash}`;
  const completionDate = new Date(certificate.completionDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const accent = tone === 'gold' ? 'text-amber-600' : 'text-emerald-600';
  const accentBorder = tone === 'gold' ? 'border-amber-500/60' : 'border-emerald-500/60';

  return (
    <div
      className={cn(
        'print-only relative overflow-hidden rounded-xl border-4 border-double bg-white text-neutral-800 shadow-card',
        accentBorder,
      )}
    >
      <div className="pointer-events-none absolute inset-2.5 rounded-lg border border-neutral-200" />

      <div className="relative px-8 py-10 sm:px-12">
        {/* Top band */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-amber-300 bg-amber-50 shadow-sm">
            <Image
              src="/brand/emit-logo.png"
              alt="EMIT Center logo"
              width={60}
              height={60}
              className="h-14 w-14 object-contain"
            />
          </div>
          <p className="font-display text-2xl font-bold tracking-tight text-neutral-900">
            EMIT Center
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-500">
            Foundation &middot; Learning Portal
          </p>
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-400/60" />
          <span className={cn('text-xs font-semibold uppercase tracking-[0.3em]', accent)}>
            Certificate of Completion
          </span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-400/60" />
        </div>

        <div className="space-y-5 text-center">
          <p className="text-sm text-neutral-500">This is to certify that</p>

          <p className="font-serif text-4xl font-semibold tracking-wide text-neutral-900 sm:text-5xl">
            {certificate.studentName}
          </p>

          <div className="mx-auto h-px w-40 bg-neutral-300" />

          <p className="text-sm text-neutral-500">has successfully completed the program</p>

          <p className="mx-auto max-w-xl px-4 font-display text-2xl font-semibold leading-snug text-amber-700">
            {certificate.courseTitle}
          </p>

          <div className="flex items-center justify-center gap-6 text-sm text-neutral-600">
            <span>
              Completed{' '}
              <span className="font-semibold text-neutral-800">{completionDate}</span>
            </span>
            <span className="h-4 w-px bg-neutral-300" />
            <span>
              Issued <span className="font-semibold text-neutral-800">{issuedDate}</span>
            </span>
          </div>
        </div>

        {/* Footer: signature + QR */}
        <div className="mt-10 grid grid-cols-3 items-end gap-4">
          <div className="text-center">
            <div className="mx-auto w-32 border-b border-neutral-300 pt-6" />
            <p className="mt-1 text-[11px] text-neutral-500">Program Director</p>
          </div>

          <div className="text-center">
            <div
              className={cn(
                'mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed',
                accentBorder,
              )}
            >
              <BadgeCheck aria-hidden="true" className={cn('h-8 w-8', accent)} />
            </div>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
              Verified Issuer
            </p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="rounded-lg border border-neutral-200 bg-white p-1.5 shadow-sm">
              <QRCodeSVG value={verifyUrl} size={88} level="M" marginSize={1} />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-500">
              Scan to verify
            </p>
          </div>
        </div>

        <p className="mt-8 break-all text-center font-mono text-[11px] text-neutral-400">
          {certificate.verificationHash} &middot; {verifyUrl}
        </p>
      </div>
    </div>
  );
}
