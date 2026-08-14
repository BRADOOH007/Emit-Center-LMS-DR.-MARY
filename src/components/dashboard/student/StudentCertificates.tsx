'use client';

import { useEffect, useState } from 'react';
import { Award, Download, ExternalLink, GraduationCap, Medal, ScrollText } from 'lucide-react';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import type { Badge as BadgeType, Certificate, Transcript } from '@/types';
import { useLocale } from '@/components/providers/AppProviders';
import { Button } from '@/components/ui/Button';

export function StudentCertificates({ studentId }: { studentId: string }) {
  const { formatDate } = useLocale();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [transcript, setTranscript] = useState<Transcript | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/certificates?userId=${encodeURIComponent(studentId)}`).then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] }))),
      fetch(`/api/badges?userId=${encodeURIComponent(studentId)}`).then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] }))),
      fetch(`/api/transcripts?userId=${encodeURIComponent(studentId)}`).then((res) => (res.ok ? res.json() : Promise.resolve({ data: null }))),
    ])
      .then(([certJson, badgeJson, transcriptJson]) => {
        if (!active) return;
        setCertificates(Array.isArray(certJson.data) ? certJson.data : []);
        setBadges(Array.isArray(badgeJson.data) ? badgeJson.data : []);
        setTranscript(transcriptJson.data ?? null);
      })
      .catch(() => {
        if (active) {
          setCertificates([]);
          setBadges([]);
          setTranscript(null);
        }
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Student · Credentials"
        title="My Credentials"
        subtitle="Certificates, badges, and your official transcript"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Certificates" value={certificates.length} hint="Earned credentials" icon={Award} tone="gold" />
        <StatCard label="Badges" value={badges.length} hint="Achievements" icon={Medal} tone="emerald" />
        <StatCard label="GPA" value={transcript?.overallGpa ?? '—'} hint="Overall grade average" icon={GraduationCap} tone="blue" />
        <StatCard label="Credits" value={transcript?.totalCredits ?? 0} hint="Courses completed" icon={ScrollText} tone="brown" />
      </div>

      <SectionPanel
        title="Official Transcript"
        icon={ScrollText}
        actions={
          <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
            <Download aria-hidden="true" className="h-4 w-4" />
            Download PDF
          </Button>
        }
      >
        {transcript && transcript.courses.length > 0 ? (
          <div className="print-only">
            <div className="mb-5 border-b border-neutral-300 pb-4 text-center">
              <p className="font-display text-2xl font-bold text-neutral-900">EMIT Center</p>
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">Official Transcript</p>
              <p className="mt-2 font-serif text-lg font-semibold text-neutral-800">{transcript.studentName}</p>
              <p className="text-xs text-neutral-500">
                {transcript.studentEmail} &middot; GPA {transcript.overallGpa ?? '—'} &middot;{' '}
                {transcript.totalCredits} credits
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-neutral-800">
                <thead>
                  <tr className="border-b border-neutral-300 text-left text-xs uppercase tracking-wider text-neutral-500">
                    <th className="py-2 pr-4 font-semibold">Course</th>
                    <th className="py-2 pr-4 font-semibold">Subject</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 pr-4 font-semibold">Grade</th>
                    <th className="py-2 pr-4 font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {transcript.courses.map((c) => (
                    <tr key={c.courseId}>
                      <td className="py-2.5 pr-4 font-medium text-neutral-900">{c.courseTitle}</td>
                      <td className="py-2.5 pr-4 text-neutral-600">{c.subject}</td>
                      <td className="py-2.5 pr-4 text-neutral-600">{c.status}</td>
                      <td className="py-2.5 pr-4 font-semibold text-neutral-900">{c.letterGrade ?? '—'}</td>
                      <td className="py-2.5 pr-4 text-neutral-600">{c.overallPercentage != null ? `${Math.round(c.overallPercentage)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-text-muted">No enrollment records yet.</p>
        )}
      </SectionPanel>

      <SectionPanel title="Badges Earned" icon={Medal}>
        {badges.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((badge) => (
              <div key={`${badge.id}-${badge.courseId ?? ''}`} className="flex items-start gap-3 rounded-xl border border-line p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-500/15">
                  <Medal aria-hidden="true" className="h-6 w-6 text-gold-600 dark:text-gold-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-text-primary">{badge.name}</p>
                  <p className="text-xs text-text-muted">{badge.description}</p>
                  {badge.earnedAt && (
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-text-muted/70">{formatDate(badge.earnedAt)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-text-muted">No badges yet. Complete courses and participate to earn them.</p>
        )}
      </SectionPanel>

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
    </div>
  );
}
