'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Video,
  Monitor,
  MessageCircle,
  ListTodo,
  PlayCircle,
  ExternalLink,
  X,
  Send,
  Clock,
  Plus,
  Loader2,
  CheckCircle2,
  PenLine,
  Eraser,
  Trash2,
  Download,
  Users,
  MonitorUp,
  StopCircle,
} from 'lucide-react';
import type { ChatMessage, LivePlatform, LiveSession } from '@/types';
import { useLocale, useSession } from '@/components/providers/AppProviders';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const PLATFORM_META: Record<LivePlatform, { label: string; color: string; bgClass: string }> = {
  zoom: { label: 'Zoom', color: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-500/10' },
  google_meet: { label: 'Google Meet', color: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-500/10' },
  teams: { label: 'Microsoft Teams', color: 'text-purple-600 dark:text-purple-400', bgClass: 'bg-purple-500/10' },
  jitsi: { label: 'Jitsi Meet', color: 'text-sky-600 dark:text-sky-400', bgClass: 'bg-sky-500/10' },
};

const CREATOR_ROLES: string[] = ['super_admin', 'administrator', 'instructor'];

export function VirtualClassModal({
  session,
  onClose,
}: {
  session: LiveSession;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'agenda' | 'chat' | 'whiteboard' | 'breakout'>('agenda');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [liveStatus, setLiveStatus] = useState<LiveSession['status']>(session.status);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [room, setRoom] = useState<string | null>(null);
  const [rooms, setRooms] = useState<string[]>(['Room 1', 'Room 2', 'Room 3']);
  const { formatDateTime } = useLocale();
  const { user } = useSession();

  const platformMeta = PLATFORM_META[session.platform];
  const isLive = liveStatus === 'live';
  const isUpcoming = liveStatus === 'upcoming';

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/live/${session.id}${room ? `?room=${encodeURIComponent(room)}` : ''}`, { cache: 'no-store' });
        const json = await res.json();
        if (active && json.success) {
          setMessages(json.data.messages ?? []);
          if (json.data.status) setLiveStatus(json.data.status);
        }
      } finally {
        if (active) setLoadingMessages(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [session.id, room]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/live/${session.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim(), room: room ?? undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => [...prev, json.data]);
        setNewMessage('');
      }
    } finally {
      setSending(false);
    }
  }, [newMessage, sending, session.id, room]);

  const canStart = CREATOR_ROLES.includes(user.activeRole);

  useEffect(() => {
    if (!isLive) return;
    const record = () =>
      fetch('/api/participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'live_join', courseId: session.courseId, liveSessionId: session.id }),
      }).catch(() => {});
    record();
    const t = setTimeout(record, 1500);
    return () => clearTimeout(t);
  }, [isLive, session.courseId, session.id]);

  const handleStart = useCallback(async () => {
    const next = isLive ? 'ended' : 'live';
    const res = await fetch(`/api/live/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    const json = await res.json();
    if (json.success) setLiveStatus(json.data.status);
  }, [isLive, session.id]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Virtual classroom" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl animate-scale-in overflow-hidden rounded-card border border-line bg-base-elevated shadow-pop">
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-text-primary truncate">{session.title}</h2>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                <span className={cn('font-semibold', platformMeta.color)}>{platformMeta.label}</span>
                <span>&middot;</span>
                <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                {formatDateTime(session.scheduledStart)} – {formatDateTime(session.scheduledEnd)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isLive && <Badge variant="success" dot>Live</Badge>}
              {isUpcoming && <Badge variant="gold">Upcoming</Badge>}
              {canStart && (
                <Button variant={isLive ? 'outline' : 'gold'} size="sm" onClick={handleStart}>
                  {isLive ? 'End Session' : 'Start Session'}
                </Button>
              )}
              <button type="button" onClick={onClose} className="btn btn-ghost btn-sm !px-1.5">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center bg-brown-900/95 p-8">
              <ScreenShare />
              <div className={cn('mb-6 flex h-24 w-24 items-center justify-center rounded-2xl', platformMeta.bgClass)}>
                <Video aria-hidden="true" className="h-12 w-12 text-gold-400" />
              </div>
              <h3 className="text-xl font-bold text-gold-200">{platformMeta.label} Classroom</h3>
              <p className="mt-2 max-w-sm text-center text-sm text-gold-300/70">
                Click below to join the live session. Your microphone and camera settings will be configured before entry.
              </p>
              <a
                href={session.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-gold btn-lg mt-6 gap-2"
              >
                <ExternalLink aria-hidden="true" className="h-5 w-5" />
                Join {platformMeta.label}
              </a>
              {session.hostKey && (
                <p className="mt-3 text-xs text-gold-300/50">
                  Host key: {session.hostKey}
                </p>
              )}
            </div>

            <div className="hidden w-80 shrink-0 border-l border-line md:flex md:flex-col">
              <div className="flex border-b border-line">
                <button
                  type="button"
                  onClick={() => setTab('agenda')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
                    tab === 'agenda'
                      ? 'text-gold-700 dark:text-gold-300 border-b-2 border-gold-600'
                      : 'text-text-muted hover:text-text-primary',
                  )}
                >
                  <ListTodo aria-hidden="true" className="h-4 w-4" />
                  Agenda
                </button>
                <button
                  type="button"
                  onClick={() => { setRoom(null); setTab('chat'); }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
                    tab === 'chat'
                      ? 'text-gold-700 dark:text-gold-300 border-b-2 border-gold-600'
                      : 'text-text-muted hover:text-text-primary',
                  )}
                >
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />
                  Chat
                </button>
              </div>
              <div className="flex border-b border-line">
                <button
                  type="button"
                  onClick={() => setTab('whiteboard')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
                    tab === 'whiteboard'
                      ? 'text-gold-700 dark:text-gold-300 border-b-2 border-gold-600'
                      : 'text-text-muted hover:text-text-primary',
                  )}
                >
                  <PenLine aria-hidden="true" className="h-4 w-4" />
                  Whiteboard
                </button>
                <button
                  type="button"
                  onClick={() => setTab('breakout')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
                    tab === 'breakout'
                      ? 'text-gold-700 dark:text-gold-300 border-b-2 border-gold-600'
                      : 'text-text-muted hover:text-text-primary',
                  )}
                >
                  <Users aria-hidden="true" className="h-4 w-4" />
                  Breakout
                </button>
              </div>

              <div className="scrollbar-thin flex-1 overflow-y-auto">
                {tab === 'agenda' && <AgendaPanel agenda={session.agenda} />}
                {tab === 'chat' && (
                  <ChatPanel
                    messages={messages}
                    newMessage={newMessage}
                    onNewMessageChange={setNewMessage}
                    onSend={handleSendMessage}
                    sending={sending}
                    loading={loadingMessages}
                    currentUserId={user.id}
                  />
                )}
                {tab === 'whiteboard' && <WhiteboardPanel />}
                {tab === 'breakout' && (
                  <BreakoutPanel
                    rooms={rooms}
                    setRooms={setRooms}
                    activeRoom={room}
                    setActiveRoom={(r) => { setRoom(r); setTab('chat'); }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgendaPanel({ agenda }: { agenda: string[] }) {
  return (
    <div className="space-y-1 p-4">
      {(agenda ?? []).length > 0 ? agenda.map((item, index) => (
        <div key={index} className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-line-soft">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-500/10 text-xs font-bold text-gold-700 dark:text-gold-300">
            {index + 1}
          </span>
          <span className="text-sm text-text-primary">{item}</span>
        </div>
      )) : (
        <p className="p-4 text-sm text-text-muted">No agenda items yet.</p>
      )}
    </div>
  );
}

function WhiteboardPanel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState('#e6c06b');
  const [size, setSize] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1a1712';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent) => {
    drawing.current = true;
    last.current = getPos(e);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#1a1712' : color;
    ctx.lineWidth = tool === 'eraser' ? size * 4 : size;
    ctx.lineCap = 'round';
    ctx.stroke();
    last.current = pos;
  };
  const onUp = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#1a1712';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whiteboard.png';
    a.click();
  };

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setTool('pen')}
          className={cn('btn btn-ghost btn-sm !px-2', tool === 'pen' && 'bg-gold-500/15 text-gold-700 dark:text-gold-300')}
        >
          <PenLine aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setTool('eraser')}
          className={cn('btn btn-ghost btn-sm !px-2', tool === 'eraser' && 'bg-gold-500/15 text-gold-700 dark:text-gold-300')}
        >
          <Eraser aria-hidden="true" className="h-4 w-4" />
        </button>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-7 cursor-pointer rounded border border-line" aria-label="Pen color" />
        <input type="range" min={1} max={10} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-16" aria-label="Stroke size" />
        <button type="button" onClick={clear} className="btn btn-ghost btn-sm !px-2" aria-label="Clear whiteboard">
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
        <button type="button" onClick={download} className="btn btn-ghost btn-sm !px-2" aria-label="Download whiteboard">
          <Download aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={280}
        height={400}
        className="w-full flex-1 cursor-crosshair rounded-lg border border-line"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />
    </div>
  );
}

function BreakoutPanel({
  rooms,
  setRooms,
  activeRoom,
  setActiveRoom,
}: {
  rooms: string[];
  setRooms: (rooms: string[]) => void;
  activeRoom: string | null;
  setActiveRoom: (room: string) => void;
}) {
  const [newRoom, setNewRoom] = useState('');

  const addRoom = () => {
    const name = newRoom.trim();
    if (!name) return;
    setRooms([...rooms, name]);
    setNewRoom('');
  };

  return (
    <div className="space-y-2 p-4">
      <p className="text-xs text-text-muted">Break into smaller discussion rooms, then rejoin the main chat.</p>
      <div className="flex gap-2">
        <input
          className="input !py-1.5 flex-1 text-sm"
          placeholder="New room name…"
          value={newRoom}
          onChange={(e) => setNewRoom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addRoom()}
        />
        <Button size="sm" variant="outline" onClick={addRoom}>
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
        </Button>
      </div>
      {rooms.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => setActiveRoom(r)}
          className={cn(
            'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
            activeRoom === r ? 'border-gold-500 bg-gold-500/10 text-gold-700 dark:text-gold-300' : 'border-line text-text-primary hover:bg-line-soft',
          )}
        >
          <span className="flex items-center gap-2">
            <Users aria-hidden="true" className="h-4 w-4" />
            {r}
          </span>
          {activeRoom === r && <Badge variant="gold">Joined</Badge>}
        </button>
      ))}
      {activeRoom && (
        <Button variant="outline" size="sm" fullWidth onClick={() => setActiveRoom(activeRoom)}>
          Return to main chat
        </Button>
      )}
    </div>
  );
}

function ScreenShare() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      stream.getVideoTracks()[0]?.addEventListener('ended', stop);
      setSharing(true);
    } catch {
      setError('Screen share was cancelled or is not supported in this browser.');
    }
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setSharing(false);
  };

  return (
    <div className="mb-4 flex flex-col items-center">
      {sharing && (
        <div className="mb-3 w-full max-w-md overflow-hidden rounded-lg border border-gold-500/40">
          <video ref={videoRef} autoPlay muted className="w-full" />
          <button type="button" onClick={stop} className="flex w-full items-center justify-center gap-1.5 bg-red-600/90 py-1.5 text-xs font-semibold text-white">
            <StopCircle aria-hidden="true" className="h-3.5 w-3.5" /> Stop sharing
          </button>
        </div>
      )}
      {!sharing && (
        <button type="button" onClick={start} className="btn btn-outline btn-sm gap-2 border-gold-500/50 text-gold-300">
          <MonitorUp aria-hidden="true" className="h-4 w-4" /> Share screen
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function ChatPanel({
  messages,
  newMessage,
  onNewMessageChange,
  onSend,
  sending,
  loading,
  currentUserId,
}: {
  messages: ChatMessage[];
  newMessage: string;
  onNewMessageChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  loading: boolean;
  currentUserId: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <p className="py-8 text-center text-xs text-text-muted">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-text-muted">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-2', msg.userId === currentUserId && 'flex-row-reverse')}>
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                msg.userId === currentUserId ? 'bg-gold-500 text-brown-900' : 'bg-brown-600 text-gold-200',
              )}>
                {msg.userName.charAt(0)}
              </div>
              <div className={cn(
                'max-w-[80%] rounded-xl px-3 py-2',
                msg.userId === currentUserId ? 'bg-gold-500/15 dark:bg-gold-500/20' : 'bg-line-soft',
              )}>
                <p className="text-[11px] font-semibold text-text-muted">{msg.userName}</p>
                <p className="text-sm text-text-primary">{msg.content}</p>
                <p className="mt-0.5 text-[10px] text-text-muted/70">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-line p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onNewMessageChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder="Type a message..."
            className="input !py-2 flex-1"
          />
          <Button variant="gold" size="md" onClick={onSend} disabled={!newMessage.trim() || sending}>
            {sending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function VirtualClassLauncher({ courseId }: { courseId: string }) {
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const { formatDateTime } = useLocale();
  const { user } = useSession();

  const canCreate = useMemo(() => CREATOR_ROLES.includes(user.activeRole), [user.activeRole]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/live?courseId=${encodeURIComponent(courseId)}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) setSessions(json.data.liveSessions ?? []);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return null;

  return (
    <>
      <div className="panel space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Video aria-hidden="true" className="h-4 w-4 text-gold-600 dark:text-gold-400" />
            Live Sessions
          </h3>
          {canCreate && (
            <Button variant="gold" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              New Session
            </Button>
          )}
        </div>
        <div className="divider" />
        {sessions.length === 0 ? (
          <p className="py-2 text-sm text-text-muted">No live sessions scheduled yet.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const meta = PLATFORM_META[session.platform];
              const isLive = session.status === 'live';
              return (
                <div key={session.id} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary truncate">{session.title}</p>
                      {isLive && <Badge variant="success" dot>Live</Badge>}
                    </div>
                    <p className="text-xs text-text-muted">
                      {formatDateTime(session.scheduledStart)} &middot;{' '}
                      <span className={meta.color}>{meta.label}</span>
                    </p>
                  </div>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => setActiveSession(session)}
                  >
                    <Video aria-hidden="true" className="h-3.5 w-3.5" />
                    Join
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {sessions.some((s) => (s.recordings ?? []).length > 0) && (
          <>
            <div className="divider" />
            <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <PlayCircle aria-hidden="true" className="h-4 w-4 text-gold-600 dark:text-gold-400" />
              Session Recordings
            </h3>
            <div className="space-y-2">
              {sessions.flatMap((s) => s.recordings ?? []).map((rec) => (
                <a
                  key={rec.id}
                  href={rec.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors hover:bg-line-soft"
                >
                  <span className="truncate text-text-primary">{rec.title}</span>
                  <span className="ml-2 shrink-0 text-xs text-text-muted">{rec.duration}</span>
                </a>
              ))}
            </div>
          </>
        )}
      </div>

      {activeSession && (
        <VirtualClassModal
          session={activeSession}
          onClose={() => setActiveSession(null)}
        />
      )}

      {createOpen && (
        <CreateSessionModal
          courseId={courseId}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}
    </>
  );
}

function CreateSessionModal({
  courseId,
  onClose,
  onCreated,
}: {
  courseId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    title: '',
    platform: 'zoom' as LivePlatform,
    joinUrl: '',
    hostKey: '',
    start: '',
    end: '',
  });
  const [agenda, setAgenda] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { user } = useSession();

  const platformMeta = PLATFORM_META[form.platform];

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.start || !form.end) {
      setError('Title and start/end times are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          title: form.title.trim(),
          platform: form.platform,
          joinUrl: form.joinUrl.trim(),
          hostKey: form.hostKey.trim(),
          scheduledStart: new Date(form.start).toISOString(),
          scheduledEnd: new Date(form.end).toISOString(),
          agenda: agenda.split('\n').map((a) => a.trim()).filter(Boolean),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to create session');
        return;
      }
      onCreated();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Create live session" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg animate-scale-in rounded-card border border-line bg-base-elevated p-5 shadow-pop">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-primary">Create Live Session</h3>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm !px-1.5" aria-label="Close">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Set up a Zoom, Google Meet, or Jitsi classroom. Students will see a Join button once it is published.
        </p>
        <div className="divider" />
        <div className="space-y-4">
          <div>
            <label htmlFor="lvs-title" className="label">Title</label>
            <input
              id="lvs-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Robotics 101 — Office Hours"
              className="input !py-2"
            />
          </div>

          <div>
            <label className="label">Platform</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PLATFORM_META) as LivePlatform[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, platform: p }))}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    form.platform === p ? 'border-gold-500 bg-gold-500/10 text-gold-700 dark:text-gold-300' : 'border-line text-text-muted hover:bg-line-soft',
                  )}
                >
                  <Monitor aria-hidden="true" className="h-3.5 w-3.5" />
                  {PLATFORM_META[p].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="lvs-url" className="label">Join URL  <span className="text-text-muted">({form.platform === 'jitsi' ? 'optional — auto-generated' : 'required for ' + platformMeta.label})</span></label>
            <input
              id="lvs-url"
              type="text"
              value={form.joinUrl}
              onChange={(e) => setForm((p) => ({ ...p, joinUrl: e.target.value }))}
              placeholder={form.platform === 'jitsi' ? 'https://meet.jit.si/...' : form.platform === 'google_meet' ? 'https://meet.google.com/...' : 'https://zoom.us/j/...'}
              className="input !py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lvs-start" className="label">Start</label>
              <input id="lvs-start" type="datetime-local" value={form.start} onChange={(e) => setForm((p) => ({ ...p, start: e.target.value }))} className="input !py-2" />
            </div>
            <div>
              <label htmlFor="lvs-end" className="label">End</label>
              <input id="lvs-end" type="datetime-local" value={form.end} onChange={(e) => setForm((p) => ({ ...p, end: e.target.value }))} className="input !py-2" />
            </div>
          </div>

          <div>
            <label htmlFor="lvs-hostkey" className="label">Host key (optional)</label>
            <input
              id="lvs-hostkey"
              type="text"
              value={form.hostKey}
              onChange={(e) => setForm((p) => ({ ...p, hostKey: e.target.value }))}
              placeholder="Internal passcode shown to hosts"
              className="input !py-2"
            />
          </div>

          <div>
            <label htmlFor="lvs-agenda" className="label">Agenda (one item per line)</label>
            <textarea
              id="lvs-agenda"
              rows={3}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder={'Q&A on setup\nCircuit debugging\nProject check-in'}
              className="input !py-2"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button variant="gold" onClick={handleSubmit} className="flex-1" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  Create Session
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}