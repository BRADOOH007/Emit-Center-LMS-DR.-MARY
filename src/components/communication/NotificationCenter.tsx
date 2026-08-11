'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  BookOpen,
  CalendarCheck,
  CheckCheck,
  GraduationCap,
  Megaphone,
  MessageCircle,
  MessageSquare,
} from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '@/lib/mock-data';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { NotificationType } from '@/types';

const TYPE_META: Record<NotificationType, { icon: typeof Bell; label: string }> = {
  assignment_due: { icon: CalendarCheck, label: 'Assignment Due' },
  class_reminder: { icon: BookOpen, label: 'Class Reminder' },
  grade_published: { icon: GraduationCap, label: 'Grade Published' },
  discussion_reply: { icon: MessageCircle, label: 'Discussion Reply' },
  message_received: { icon: MessageSquare, label: 'Message Received' },
  announcement: { icon: Megaphone, label: 'Announcement' },
};

export function NotificationCenter({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(
    MOCK_NOTIFICATIONS.filter((n) => n.userId === userId),
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  const recent = useMemo(
    () => notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [notifications],
  );

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="btn btn-ghost btn-md !px-2 relative"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div aria-hidden="true" className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-[22rem] animate-scale-in rounded-card border border-line bg-base-elevated shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <button type="button" onClick={handleMarkAllRead} className="text-xs font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400">
                  Mark all read
                </button>
              )}
            </div>

            <div className="scrollbar-thin max-h-[24rem] overflow-y-auto">
              {recent.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <Bell aria-hidden="true" className="mb-2 h-8 w-8 text-text-muted/30" />
                  <p className="text-sm text-text-muted">No notifications</p>
                </div>
              ) : (
                recent.map((notif) => {
                  const meta = TYPE_META[notif.type];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        'flex items-start gap-3 border-b border-line p-4 transition-colors',
                        !notif.isRead && 'bg-gold-500/5 dark:bg-gold-500/10',
                      )}
                      onClick={() => handleMarkRead(notif.id)}
                    >
                      <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        !notif.isRead ? 'bg-gold-500/15' : 'bg-line-soft',
                      )}>
                        <Icon aria-hidden="true" className={cn('h-4 w-4', !notif.isRead ? 'text-gold-600 dark:text-gold-400' : 'text-text-muted')} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-text-primary">{notif.title}</p>
                          {!notif.isRead && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold-500" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-text-muted line-clamp-2">{notif.body}</p>
                        <p className="mt-1 text-[10px] text-text-muted/70">
                          {new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center border-t border-line px-4 py-2.5 text-xs font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400"
            >
              View all notifications
              <CheckCheck aria-hidden="true" className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export function NotificationList({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState(
    MOCK_NOTIFICATIONS.filter((n) => n.userId === userId),
  );

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const sorted = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{sorted.length} notifications</p>
        <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
          <CheckCheck aria-hidden="true" className="h-4 w-4" />
          Mark all read
        </Button>
      </div>

      <div className="space-y-1">
        {sorted.map((notif) => {
          const meta = TYPE_META[notif.type];
          const Icon = meta.icon;
          return (
            <div
              key={notif.id}
              className={cn(
                'card flex items-start gap-4 p-4 transition-colors',
                !notif.isRead && 'border-l-2 border-l-gold-500 bg-gold-500/5 dark:bg-gold-500/10',
              )}
            >
              <div className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                !notif.isRead ? 'bg-gold-500/15' : 'bg-line-soft',
              )}>
                <Icon aria-hidden="true" className={cn('h-5 w-5', !notif.isRead ? 'text-gold-600' : 'text-text-muted')} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">{notif.title}</p>
                      <Badge variant="neutral" className="!text-[10px]">{meta.label}</Badge>
                      {!notif.isRead && <span className="h-2 w-2 rounded-full bg-gold-500" />}
                    </div>
                    <p className="mt-1 text-sm text-text-muted">{notif.body}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-[11px] text-text-muted">
                    {new Date(notif.createdAt).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  {notif.actionUrl && (
                    <Link
                      href={notif.actionUrl}
                      className="text-xs font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400"
                    >
                      View details
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
