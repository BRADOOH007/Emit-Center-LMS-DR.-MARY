'use client';

import Image from 'next/image';
import { Great_Vibes } from 'next/font/google';
import { ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Certificate } from '@/types';
import { cn } from '@/lib/utils';

const greatVibes = Great_Vibes({ subsets: ['latin'], weight: '400', display: 'swap' });

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

  const accent = tone === 'gold' ? 'text-amber-700' : 'text-emerald-700';
  const accentBorder = tone === 'gold' ? 'border-amber-400/70' : 'border-emerald-500/70';
  const foil = tone === 'gold' ? 'from-amber-200 via-amber-400 to-amber-600' : 'from-emerald-200 via-emerald-500 to-emerald-700';
  const corner = tone === 'gold' ? 'text-amber-400' : 'text-emerald-500';

  const stampRotation = tone === 'gold' ? 'text-amber-800' : 'text-emerald-800';

  return (
    <div className={cn('print-only relative overflow-hidden rounded-xl bg-white text-neutral-800 shadow-card', accentBorder)}>
      {/* Foil keyline frame */}
      <div className={cn('absolute inset-0 border-8 border-transparent', 'bg-gradient-to-tr p-[3px]', foil)}>
        <div className="h-full w-full rounded-lg bg-white" />
      </div>
      <div className="absolute inset-[3px] rounded-lg border border-white/60" />
      <div className="pointer-events-none absolute inset-6 rounded-lg border border-neutral-200" />

      {/* Corner flourishes */}
      <Corner className={cn('left-5 top-5', corner)} />
      <Corner className={cn('right-5 top-5 rotate-90', corner)} />
      <Corner className={cn('bottom-5 right-5 rotate-180', corner)} />
      <Corner className={cn('bottom-5 left-5 -rotate-90', corner)} />

      {/* Watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Image
          src="/brand/emit-logo.png"
          alt=""
          width={420}
          height={420}
          className="h-[72%] w-[72%] rounded-full object-contain opacity-[0.05]"
          aria-hidden="true"
        />
      </div>

      <div className="relative px-10 py-12 sm:px-14">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100 shadow-sm">
            <Image
              src="/brand/emit-logo.png"
              alt="EMIT Center logo"
              width={60}
              height={60}
              className="h-14 w-14 object-contain"
            />
          </div>
          <p className="font-display text-3xl font-bold tracking-tight text-neutral-900">EMIT Center</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-neutral-500">
            Educational &amp; Maker Innovation Technology
          </p>
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/70 to-amber-400/70" />
          <span className={cn('text-xs font-bold uppercase tracking-[0.3em]', accent)}>
            Certificate of Completion
          </span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-400/70 to-amber-400/70" />
        </div>

        <div className="space-y-5 text-center">
          <p className="text-sm text-neutral-500">This is proudly presented to</p>

          <p className="font-serif text-4xl font-semibold tracking-wide text-neutral-900 sm:text-5xl">
            {certificate.studentName}
          </p>

          <div className="mx-auto h-px w-48 bg-gradient-to-r from-transparent via-neutral-400 to-transparent" />

          <p className="text-sm text-neutral-500">for successfully completing the program</p>

          <p className={cn('mx-auto max-w-xl px-4 font-display text-2xl font-semibold leading-snug', accent)}>
            {certificate.courseTitle}
          </p>

          <div className="flex items-center justify-center gap-6 text-sm text-neutral-600">
            <span>
              Completed <span className="font-semibold text-neutral-800">{completionDate}</span>
            </span>
            <span className="h-4 w-px bg-neutral-300" />
            <span>
              Issued <span className="font-semibold text-neutral-800">{issuedDate}</span>
            </span>
          </div>
        </div>

        {/* Footer: signature + digital stamp + QR */}
        <div className="mt-12 grid grid-cols-3 items-end gap-4">
          <div className="text-center">
            <p className={cn('mx-auto text-3xl leading-none text-neutral-700', greatVibes.className)}>
              Dr. Mary Mwangi
            </p>
            <div className="mx-auto mt-1 w-36 border-b-2 border-neutral-400" />
            <p className="mt-1 text-[11px] font-semibold tracking-wide text-neutral-500">Program Director</p>
            <p className="text-[10px] text-neutral-400">EMIT Center Learning</p>
          </div>

          {/* Embossed digital stamp */}
          <div className="flex flex-col items-center gap-1">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                <circle cx="50" cy="50" r="46" fill="none" className={accentBorder} strokeWidth="1.5" strokeDasharray="3 3" />
                <defs>
                  <path id="stampCircle" d="M50,50 m-40,0 a40,40 0 1,1 80,0 a40,40 0 1,1 -80,0" fill="none" />
                </defs>
                <text fontSize="10.5" fontWeight="600" className={stampRotation} fill="currentColor">
                  <textPath href="#stampCircle">
                    VERIFIED CERTIFICATE &middot; EMIT CENTER &middot; GENUINE
                  </textPath>
                </text>
              </svg>
              <div className={cn('flex h-12 w-12 items-center justify-center rounded-full border', accentBorder)}>
                <ShieldCheck aria-hidden="true" className={cn('h-7 w-7', accent)} />
              </div>
            </div>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Digital Stamp
            </p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="rounded-lg border border-neutral-300 bg-white p-1.5 shadow-sm">
              <QRCodeSVG value={verifyUrl} size={92} level="M" marginSize={1} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Scan to verify
            </p>
          </div>
        </div>

        <p className="mt-8 break-all text-center font-mono text-[11px] text-neutral-400">
          Certificate No. {certificate.verificationHash}
        </p>
        <p className="break-all text-center font-mono text-[11px] text-neutral-400">{verifyUrl}</p>
      </div>
    </div>
  );
}

function Corner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn('pointer-events-none absolute h-9 w-9', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M1 12.5V1h11.5" />
      <path d="M5 12.5V5h7.5" strokeOpacity="0.5" />
    </svg>
  );
}