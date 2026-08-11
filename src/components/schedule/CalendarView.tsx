'use client';

import { ArrowLeft, ArrowRight, Clock, Globe, MapPin, Monitor, Video } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { ClassSession } from '@/types';
import { MOCK_SESSIONS, MOCK_USERS, MOCK_ROOMS } from '@/lib/mock-data';
import { formatDate, formatTime } from '@/lib/i18n/date';
import { useLocale, useSession } from '@/components/providers/AppProviders';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

export function CalendarView() {
  const { user } = useSession();
  const { timeZone: localTz, locale, formatDate: fmtDate, formatTime: fmtTime } = useLocale();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [showLocalTime, setShowLocalTime] = useState(true);

  const weekStart = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7);
    now.setHours(0, 0, 0, 0);
    return now;
  }, [weekOffset]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart],
  );

  const weekDateStr = useMemo(() => {
    const f = fmtDate(weekStart.toISOString());
    const l = fmtDate(weekDays[6].toISOString());
    return `${f} — ${l}`;
  }, [weekStart, weekDays, fmtDate]);

  const sessionsForWeek = useMemo(() => {
    const enriched = MOCK_SESSIONS.map((s) => ({
      ...s,
      instructor: MOCK_USERS.find((u) => u.id === s.instructorId),
      room: s.roomId ? MOCK_ROOMS.find((r) => r.id === s.roomId) : undefined,
    }));
    return enriched.filter((s) => {
      const sessionDate = new Date(s.date + 'T00:00:00.000Z');
      return sessionDate >= weekDays[0] && sessionDate <= weekDays[6];
    });
  }, [weekDays]);

  const getSessionsForDay = useCallback(
    (day: Date) => sessionsForWeek.filter((s) => {
      const sessionDate = new Date(s.date + 'T00:00:00.000Z');
      return sessionDate.toDateString() === day.toDateString();
    }),
    [sessionsForWeek],
  );

  const formatTimeDisplay = useCallback(
    (time: string, hostTz: string) => {
      const dateStr = `2026-01-01T${time}:00.000Z`;
      const displayTz = showLocalTime ? localTz : hostTz;
      return fmtTime(dateStr, { hour: 'numeric', minute: '2-digit' });
    },
    [localTz, showLocalTime, fmtTime],
  );

  const isToday = (day: Date) => new Date().toDateString() === day.toDateString();

  const getSessionLeft = (session: ClassSession) => {
    const [h, m] = session.startTime.split(':').map(Number);
    const fractional = h + m / 60 - HOURS[0];
    return (fractional / HOURS.length) * 100;
  };

  const getSessionTop = (session: ClassSession) => {
    const [startH, startM] = session.startTime.split(':').map(Number);
    const [endH, endM] = session.endTime.split(':').map(Number);
    const duration = (endH * 60 + endM - (startH * 60 + startM)) / 60;
    return Math.max(duration, 0.5) * (100 / HOURS.length) * 0.95;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setWeekOffset((p) => p - 1)} className="btn btn-outline btn-sm">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setWeekOffset(0)} className="btn btn-ghost btn-sm">
            Today
          </button>
          <button type="button" onClick={() => setWeekOffset((p) => p + 1)} className="btn btn-outline btn-sm">
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
          <span className="ml-2 text-sm font-medium text-text-primary">{weekDateStr}</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={showLocalTime}
              onChange={(e) => setShowLocalTime(e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-gold-600"
            />
            <Globe aria-hidden="true" className="h-3.5 w-3.5" />
            {showLocalTime ? 'My time' : 'Host time'}
          </label>
          <Badge variant="neutral" className="text-[11px]">{showLocalTime ? localTz : 'Host timezones'}</Badge>
        </div>
      </div>

      <div className="overflow-x-auto rounded-panel border border-line bg-base-surface shadow-card">
        <div className="grid min-w-[56rem] grid-cols-8">
          <div className="border-b border-r border-line bg-line-soft/50 px-2 py-2 text-center text-[11px] font-medium text-text-muted uppercase">Time</div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'border-b border-r border-line px-2 py-2 text-center',
                isToday(day) && 'bg-gold-500/5',
              )}
            >
              <p className="text-xs font-semibold text-text-primary">
                {fmtDate(day.toISOString(), { weekday: 'short' })}
              </p>
              <p className={cn(
                'mt-0.5 text-xl font-bold',
                isToday(day) ? 'text-gold-600 dark:text-gold-400' : 'text-text-primary',
              )}>
                {day.getDate()}
              </p>
            </div>
          ))}

          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-b border-r border-line px-2 py-3 text-center text-[11px] font-medium text-text-muted">
                {hour % 12 || 12}{hour < 12 ? 'am' : 'pm'}
              </div>
              {weekDays.map((day) => {
                const sessions = getSessionsForDay(day).filter((s) => {
                  const h = parseInt(s.startTime.split(':')[0], 10);
                  return h === hour;
                });
                return (
                  <div key={day.toISOString() + hour} className="relative border-b border-r border-line p-1 min-h-[3.5rem]">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => setSelectedSession(session)}
                        className={cn(
                          'relative z-10 w-full rounded-md px-2 py-1.5 text-left text-xs leading-tight transition-colors hover:brightness-95',
                          session.format === 'onsite' && 'bg-brown-600 text-white',
                          session.format === 'online' && 'bg-gold-500 text-brown-900',
                          session.format === 'hybrid' && 'bg-gold-500/20 text-brown-800 dark:bg-gold-500/30 dark:text-gold-100',
                        )}
                      >
                        <p className="truncate font-semibold">{session.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 opacity-80">
                          <Clock aria-hidden="true" className="h-3 w-3" />
                          {formatTimeDisplay(session.startTime, session.hostTimezone)} –{' '}
                          {formatTimeDisplay(session.endTime, session.hostTimezone)}
                        </p>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {selectedSession && (
        <SessionDetailPanel
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          formatTimeDisplay={formatTimeDisplay}
          localTz={localTz}
        />
      )}
    </div>
  );
}

function SessionDetailPanel({
  session,
  onClose,
  formatTimeDisplay,
  localTz,
}: {
  session: ClassSession;
  onClose: () => void;
  formatTimeDisplay: (time: string, tz: string) => string;
  localTz: string;
}) {
  const icon = session.format === 'onsite' ? MapPin : session.format === 'online' ? Monitor : Video;
  return (
    <div className="panel space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant={session.format === 'onsite' ? 'brown' : session.format === 'online' ? 'gold' : 'neutral'}>
              {session.format}
            </Badge>
            <Badge variant="neutral">{session.sessionType}</Badge>
            {session.status === 'live' && <Badge variant="success" dot>Live</Badge>}
          </div>
          <h3 className="mt-2 font-display text-lg font-semibold text-text-primary">{session.title}</h3>
        </div>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">Close</button>
      </div>
      <div className="divider" />
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Clock aria-hidden="true" className="h-4 w-4 text-text-muted" />
          <span className="text-text-primary">
            {formatTimeDisplay(session.startTime, session.hostTimezone)} –{' '}
            {formatTimeDisplay(session.endTime, session.hostTimezone)}
          </span>
          <span className="text-[11px] text-text-muted">({localTz})</span>
        </div>
        <div className="flex items-center gap-2">
          <Globe aria-hidden="true" className="h-4 w-4 text-text-muted" />
          <span className="text-text-primary">Host: {session.hostTimezone}</span>
        </div>
        {session.room && (
          <div className="flex items-center gap-2">
            <MapPin aria-hidden="true" className="h-4 w-4 text-text-muted" />
            <span className="text-text-primary">{session.room.name} ({session.room.capacity} seats)</span>
          </div>
        )}
        {session.instructor && (
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Instructor:</span>
            <span className="font-medium text-text-primary">{session.instructor.fullName}</span>
          </div>
        )}
        {session.meetingLink && (
          <div className="flex items-center gap-2">
            <Video aria-hidden="true" className="h-4 w-4 text-text-muted" />
            <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" className="text-gold-600 hover:text-gold-700 dark:text-gold-400 underline text-sm">
              Join {session.meetingPlatform ?? 'session'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
