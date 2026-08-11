'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  Flag,
  Loader2,
  MessageCircle,
  MessageSquare,
  Pin,
  Plus,
  Send,
  ShieldCheck,
  ThumbsUp,
} from 'lucide-react';
import type { DiscussionReply, DiscussionThread } from '@/types';
import { useSession } from '@/components/providers/AppProviders';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cn } from '@/lib/utils';

export function DiscussionForum({ courseId }: { courseId: string }) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [newThreadOpen, setNewThreadOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/discussions/${courseId}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setThreads(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreated = useCallback(() => {
    setNewThreadOpen(false);
    load();
  }, [load]);

  if (selectedThreadId) {
    return (
      <DiscussionThreadView
        courseId={courseId}
        threadId={selectedThreadId}
        onBack={() => setSelectedThreadId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          {loading ? 'Loading threads…' : `${threads.length} thread${threads.length !== 1 ? 's' : ''}`}
        </p>
        <Button variant="gold" size="sm" onClick={() => setNewThreadOpen(true)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          New Thread
        </Button>
      </div>

      {newThreadOpen && (
        <NewThreadForm
          courseId={courseId}
          onClose={() => setNewThreadOpen(false)}
          onCreated={handleCreated}
        />
      )}

      <div className="space-y-2">
        {loading ? (
          <p className="flex items-center gap-2 py-10 text-center text-sm text-text-muted">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Loading discussions…
          </p>
        ) : threads.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-muted">No threads yet. Start the conversation!</p>
        ) : (
          threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedThreadId(thread.id)}
              className="card w-full p-4 text-left transition-colors hover:border-gold-500/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {thread.isPinned && <Pin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-gold-500" />}
                    <h3 className="truncate text-sm font-semibold text-text-primary">{thread.title}</h3>
                    {thread.isEndorsed && (
                      <Badge variant="gold" className="!text-[10px] shrink-0">
                        <ThumbsUp aria-hidden="true" className="h-2.5 w-2.5" />
                        Endorsed
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-text-muted">{thread.content}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  {thread.author && <UserAvatar name={thread.author.fullName} size="sm" />}
                  {thread.author?.fullName}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle aria-hidden="true" className="h-3.5 w-3.5" />
                  {thread.replyCount}
                </span>
                <span className="flex items-center gap-1">
                  <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                  {thread.viewCount}
                </span>
                <span>
                  {new Date(thread.lastReplyAt ?? thread.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function DiscussionThreadView({
  courseId,
  threadId,
  onBack,
}: {
  courseId: string;
  threadId: string;
  onBack: () => void;
}) {
  const [thread, setThread] = useState<DiscussionThread | null>(null);
  const [replies, setReplies] = useState<DiscussionReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [flagOpen, setFlagOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useSession();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/discussions/${courseId}/${threadId}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setThread(json.data.thread);
        setReplies(json.data.replies ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, threadId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReply = useCallback(async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/discussions/${courseId}/${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setReplies((prev) => [...prev, json.data]);
        setThread((prev) => (prev ? { ...prev, replyCount: prev.replyCount + 1, lastReplyAt: new Date().toISOString() } : prev));
        setReplyText('');
      }
    } finally {
      setSending(false);
    }
  }, [replyText, sending, courseId, threadId]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-10 text-center text-sm text-text-muted">
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        Loading thread…
      </p>
    );
  }

  if (!thread) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="btn btn-ghost btn-sm">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <h2 className="truncate text-lg font-bold text-text-primary">{thread.title}</h2>
      </div>

      <div className="card space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {thread.author && <UserAvatar name={thread.author.fullName} size="md" />}
            <div>
              <p className="text-sm font-semibold text-text-primary">{thread.author?.fullName}</p>
              <p className="text-xs text-text-muted">{new Date(thread.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {thread.isEndorsed && <Badge variant="gold" className="text-[10px]"><ThumbsUp aria-hidden="true" className="h-2.5 w-2.5" /> Endorsed</Badge>}
            {thread.isPinned && <Badge variant="brown" className="text-[10px]">Pinned</Badge>}
            <button type="button" onClick={() => setFlagOpen(true)} className="btn btn-ghost btn-sm !px-1.5" aria-label="Flag thread">
              <Flag aria-hidden="true" className="h-4 w-4 text-text-muted" />
            </button>
          </div>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{thread.content}</p>
      </div>

      {replies.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </p>
          {replies.map((reply) => (
            <div
              key={reply.id}
              className={cn(
                'card space-y-3 p-4',
                reply.isModeratorReply && 'border-l-2 border-l-gold-500',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {reply.author && <UserAvatar name={reply.author.fullName} size="sm" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">{reply.author?.fullName}</p>
                      {reply.isModeratorReply && (
                        <span className="flex items-center gap-1 rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold-700 dark:text-gold-300">
                          <ShieldCheck aria-hidden="true" className="h-2.5 w-2.5" />
                          Instructor
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">{new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                {reply.isEndorsed && (
                  <ThumbsUp aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-gold-500" />
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap text-text-primary">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      {!thread.isLocked && (
        <div className="card p-4">
          <div className="flex gap-2">
            <textarea
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              className="input !py-2 flex-1"
            />
            <Button variant="gold" size="md" onClick={handleReply} disabled={!replyText.trim() || sending}>
              {sending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {flagOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div aria-hidden="true" onClick={() => setFlagOpen(false)} className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 w-full max-w-sm animate-scale-in rounded-card border border-line bg-base-elevated p-5 shadow-pop">
            <p className="font-semibold text-text-primary">Report this thread</p>
            <p className="mt-1 text-xs text-text-muted">Select a reason:</p>
            <div className="mt-3 space-y-1">
              {(['inappropriate', 'spam', 'off-topic', 'other'] as const).map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setFlagOpen(false)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-text-primary hover:bg-line-soft"
                >
                  {reason.charAt(0).toUpperCase() + reason.slice(1).replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewThreadForm({
  courseId,
  onClose,
  onCreated,
}: {
  courseId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useSession();

  const handleCreate = async () => {
    if (!title.trim() || !content.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/discussions/${courseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), authorId: user.id }),
      });
      const json = await res.json();
      if (json.success) onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card space-y-3 p-5">
      <p className="text-sm font-semibold text-text-primary">New Discussion Thread</p>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Thread title..."
        className="input !py-2"
      />
      <textarea
        rows={4}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What would you like to discuss?"
        className="input !py-2"
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="gold" size="sm" onClick={handleCreate} disabled={!title.trim() || !content.trim() || saving}>
          {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : 'Post Thread'}
        </Button>
      </div>
    </div>
  );
}