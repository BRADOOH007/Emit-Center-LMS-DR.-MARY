'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  Plus,
  Search,
  Send,
  UserRound,
} from 'lucide-react';
import { MOCK_DIRECT_MESSAGES, MOCK_USERS } from '@/lib/mock-data';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cn } from '@/lib/utils';
import type { DirectMessage } from '@/types';

export function MessagingInbox({ userId }: { userId: string }) {
  const [search, setSearch] = useState('');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  const userMessages = useMemo(
    () =>
      MOCK_DIRECT_MESSAGES.filter((m) => m.senderId === userId || m.receiverId === userId)
        .map((m) => ({
          ...m,
          sender: MOCK_USERS.find((u) => u.id === m.senderId),
          receiver: MOCK_USERS.find((u) => u.id === m.receiverId),
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [userId],
  );

  const threadParticipants = useMemo(() => {
    const ids = new Set<string>();
    userMessages.forEach((m) => {
      ids.add(m.senderId === userId ? m.receiverId : m.senderId);
    });
    return Array.from(ids)
      .map((id) => {
        const messages = userMessages.filter((m) => m.senderId === id || m.receiverId === id);
        const lastMsg = messages[0];
        const unread = messages.filter((m) => !m.isRead && m.receiverId === userId).length;
        const participant = MOCK_USERS.find((u) => u.id === id);
        return { id, participant, lastMessage: lastMsg, messages, unread };
      })
      .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
  }, [userMessages, userId]);

  const filteredThreads = useMemo(() => {
    if (!search) return threadParticipants;
    const q = search.toLowerCase();
    return threadParticipants.filter(
      (t) =>
        t.participant?.fullName.toLowerCase().includes(q) ||
        t.lastMessage.subject.toLowerCase().includes(q),
    );
  }, [threadParticipants, search]);

  const activeThread = useMemo(
    () => threadParticipants.find((t) => t.id === activeThreadId),
    [threadParticipants, activeThreadId],
  );

  const handleSendReply = useCallback(() => {
    if (!replyText.trim() || !activeThread) return;
    MOCK_DIRECT_MESSAGES.push({
      id: `msg_${Date.now()}`,
      senderId: userId,
      receiverId: activeThread.id,
      subject: `Re: ${activeThread.lastMessage.subject}`,
      content: replyText.trim(),
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    setReplyText('');
  }, [replyText, activeThread, userId]);

  if (activeThread) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setActiveThreadId(null)} className="btn btn-ghost btn-sm">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <UserAvatar name={activeThread.participant?.fullName ?? 'User'} size="md" />
            <div>
              <p className="text-sm font-semibold text-text-primary">{activeThread.participant?.fullName}</p>
              <p className="text-xs text-text-muted">{activeThread.participant?.email}</p>
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="scrollbar-thin space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {activeThread.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((msg) => {
            const isMe = msg.senderId === userId;
            const author = MOCK_USERS.find((u) => u.id === msg.senderId);
            return (
              <div key={msg.id} className={cn('flex gap-3', isMe && 'flex-row-reverse')}>
                {author && <UserAvatar name={author.fullName} size="sm" />}
                <div className={cn(
                  'max-w-[75%] rounded-xl px-3 py-2',
                  isMe ? 'bg-gold-500/15 dark:bg-gold-500/20' : 'bg-line-soft',
                )}>
                  <p className="text-xs font-semibold text-text-muted">{msg.subject}</p>
                  <p className="mt-1 text-sm text-text-primary whitespace-pre-wrap">{msg.content}</p>
                  <p className="mt-1 text-[10px] text-text-muted/70">
                    {new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card flex gap-2 p-3">
          <textarea
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            className="input !py-2 flex-1"
          />
          <Button variant="gold" size="md" onClick={handleSendReply} disabled={!replyText.trim()}>
            <Send aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages..."
            className="input !pl-9 !py-2"
          />
        </div>
        <Button variant="gold" size="sm" onClick={() => setComposerOpen(true)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          New
        </Button>
      </div>

      {composerOpen && (
        <MessageComposer
          userId={userId}
          onClose={() => setComposerOpen(false)}
        />
      )}

      <div className="space-y-1">
        {filteredThreads.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <MessageSquare aria-hidden="true" className="mb-3 h-10 w-10 text-text-muted/40" />
            <p className="text-sm font-medium text-text-primary">No messages</p>
            <p className="text-xs text-text-muted">Start a conversation with an instructor.</p>
          </div>
        )}
        {filteredThreads.map((thread) => (
          <button
            key={thread.id}
            type="button"
            onClick={() => setActiveThreadId(thread.id)}
            className="card flex w-full items-center gap-3 p-4 text-left transition-colors hover:border-gold-500/30"
          >
            <UserAvatar name={thread.participant?.fullName ?? 'User'} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">{thread.participant?.fullName}</p>
                <span className="text-[10px] text-text-muted">
                  {new Date(thread.lastMessage.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="truncate text-xs font-medium text-text-primary">{thread.lastMessage.subject}</p>
              <p className="mt-0.5 truncate text-xs text-text-muted">{thread.lastMessage.content.slice(0, 80)}</p>
            </div>
            {thread.unread > 0 && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-brown-900">
                {thread.unread}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageComposer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [receiver, setReceiver] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  const receivers = MOCK_USERS.filter((u) => u.id !== userId && (u.roles.includes('instructor') || u.roles.includes('parent')));

  const handleSend = () => {
    if (!receiver || !subject.trim() || !content.trim()) return;
    MOCK_DIRECT_MESSAGES.push({
      id: `msg_${Date.now()}`,
      senderId: userId,
      receiverId: receiver,
      subject: subject.trim(),
      content: content.trim(),
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="card space-y-3 p-4">
      <p className="text-sm font-semibold text-text-primary">New Message</p>
      <div>
        <label htmlFor="msg-receiver" className="label">To</label>
        <select
          id="msg-receiver"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
          className="input !py-2"
        >
          <option value="">Select recipient...</option>
          {receivers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName} ({u.roles.join(', ')})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="msg-subject" className="label">Subject</label>
        <input
          id="msg-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input !py-2"
          placeholder="Message subject..."
        />
      </div>
      <div>
        <label htmlFor="msg-content" className="label">Message</label>
        <textarea
          id="msg-content"
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="input !py-2"
          placeholder="Type your message..."
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
        <Button variant="gold" size="sm" onClick={handleSend} className="flex-1" disabled={!receiver || !subject.trim() || !content.trim()}>
          <Send aria-hidden="true" className="h-4 w-4" />
          Send
        </Button>
      </div>
    </div>
  );
}
