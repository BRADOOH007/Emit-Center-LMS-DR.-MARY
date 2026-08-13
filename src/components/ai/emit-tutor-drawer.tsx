'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, Mic, Volume2, Copy, RefreshCw, Check, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSession } from '@/components/providers/AppProviders';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface EmitTutorDrawerProps {
  open: boolean;
  onClose: () => void;
  studentName?: string;
  currentSubject?: string;
  currentTopic?: string;
  currentGrade?: string;
  currentCurriculum?: string;
  initialPrompt?: string;
}

const QUICK_CHIPS = [
  { label: 'Explain simply', icon: '💡' },
  { label: 'Quiz me on this', icon: '📝' },
  { label: 'Real-world example', icon: '🎯' },
  { label: 'Step-by-step breakdown', icon: '🚀' },
];

export function EmitTutorDrawer({
  open,
  onClose,
  studentName,
  currentSubject,
  currentTopic,
  currentGrade,
  currentCurriculum,
  initialPrompt,
}: EmitTutorDrawerProps) {
  const { user } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const pendingPromptRef = useRef<string | null>(null);

  const name = (studentName || user.name || 'Student').split(' ')[0];
  const subject = currentSubject || 'your studies';
  const topic = currentTopic || '';

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/ai/chat/history?limit=20')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { messages?: Array<{ id: string; role: string; content: string }> }) => {
        const history: Message[] = (data?.messages || []).map((m) => ({
          id: m.id || Date.now().toString(),
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));
        if (history.length > 0) {
          setMessages(history);
          messagesRef.current = history;
          return;
        }
        setMessages([
          {
            id: 'greeting',
            role: 'assistant',
            content: `Hi ${name}! I'm Emit Tutor Bot, your personal AI tutor. ${topic ? `Ready to tackle **${topic}** in ${subject}?` : `Ready to help you with ${subject} today?`} What would you like to focus on?`,
          },
        ]);
      })
      .catch(() => {
        if (messages.length === 0) {
          setMessages([
            {
              id: 'greeting',
              role: 'assistant',
              content: `Hi ${name}! I'm Emit Tutor Bot, your personal AI tutor. ${topic ? `Ready to tackle **${topic}** in ${subject}?` : `Ready to help you with ${subject} today?`} What would you like to focus on?`,
            },
          ]);
        }
      });

    if (open) inputRef.current?.focus();
    synthRef.current = typeof window !== 'undefined' ? window.speechSynthesis : null;
    pendingPromptRef.current = initialPrompt?.trim() || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !pendingPromptRef.current) return;
    if (messages.length === 1) {
      const p = pendingPromptRef.current;
      pendingPromptRef.current = null;
      sendMessage(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setSending(true);
    setStreaming(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messagesRef.current.map((m) => ({ role: m.role, content: m.content })),
          context: 'student_tutor',
          studentName: name,
          subject,
          topic,
          grade: currentGrade || '',
          curriculum: currentCurriculum || 'common-core',
        }),
      });
      if (!res.ok) {
        let msg = 'Sorry, I ran into an issue. Can you try again?';
        try {
          const errJson = await res.json();
          if (errJson?.error) msg = errJson.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const json = await res.json();
      const data = json.success ? json.data : json;
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Sorry, I had trouble processing that.',
      };
      setMessages((p) => [...p, aiMsg]);
    } catch (err: any) {
      setMessages((p) => [
        ...p,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: err?.message || 'Sorry, I ran into an issue. Can you try again?' },
      ]);
    } finally {
      setSending(false);
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const copyMessage = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const speakMessage = (content: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const plain = content.replace(/[#*`\[\]>|~_-]/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(plain);

    let voices = synthRef.current.getVoices();
    if (voices.length === 0) {
      synthRef.current.onvoiceschanged = () => {
        voices = synthRef.current!.getVoices();
        pickBestVoice(utterance, voices);
        synthRef.current!.speak(utterance);
      };
      return;
    }
    pickBestVoice(utterance, voices);
    synthRef.current.speak(utterance);
  };

  function pickBestVoice(utterance: SpeechSynthesisUtterance, voices: SpeechSynthesisVoice[]) {
    const preferred = [
      'Samantha',
      'Google US English',
      'Google UK English Female',
      'Microsoft Zira',
      'Microsoft Hazel',
      'Microsoft Aria',
      'Karen',
      'Moira',
      'Fiona',
      'Veena',
    ];
    for (const vname of preferred) {
      const match = voices.find((v) => v.name.includes(vname));
      if (match) {
        utterance.voice = match;
        break;
      }
    }
    if (!utterance.voice) {
      utterance.voice =
        voices.find((v) => v.name.toLowerCase().includes('female') && v.lang.startsWith('en')) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
    }
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
  }

  const regenerate = async (msgId: string) => {
    const idx = messages.findIndex((m) => m.id === msgId);
    if (idx < 1) return;
    setMessages((p) => p.filter((m) => m.id !== msgId));
    const prevUser = messages.filter((m) => m.role === 'user').pop();
    if (prevUser) sendMessage(prevUser.content);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

      <div className="absolute inset-0 bg-white flex flex-col pointer-events-auto sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[400px] sm:max-w-md sm:border-l sm:border-slate-200 sm:shadow-2xl rounded-none dark:bg-slate-900">
        <div className="flex justify-center pt-2 shrink-0 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>

        <div className="pt-safe bg-gradient-to-r from-gold-500 to-brown-600 text-white shrink-0">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-sm truncate">Emit Tutor Bot</h2>
                {subject && (
                  <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm inline-block mt-0.5 max-w-full truncate">
                    {subject}
                    {topic ? ` · ${topic}` : ''}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close AI Tutor"
              className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0"
            >
              <X className="h-5 w-5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-brown-600 text-white rounded-2xl rounded-tr-none p-3.5 text-sm'
                    : 'bg-slate-100 text-slate-900 rounded-2xl rounded-tl-none p-3.5 text-sm dark:bg-slate-800 dark:text-slate-100'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <>
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-code:bg-slate-200 prose-code:px-1 prose-code:rounded prose-pre:bg-slate-800 prose-pre:text-slate-100 dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.id !== 'greeting' && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                        <button
                          onClick={() => copyMessage(msg.content, msg.id)}
                          className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title="Copy"
                          aria-label="Copy message"
                        >
                          {copiedId === msg.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => speakMessage(msg.content)}
                          className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title="Read aloud"
                          aria-label="Read message aloud"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => regenerate(msg.id)}
                          className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-auto"
                          title="Regenerate"
                          aria-label="Regenerate response"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {streaming && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl rounded-tl-none p-3.5 dark:bg-slate-800">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 pt-2 pb-0 flex gap-2 overflow-x-auto shrink-0">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => sendMessage(`${chip.icon} ${chip.label}`)}
              className="shrink-0 h-11 inline-flex items-center text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full px-4 transition-colors dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {chip.icon} {chip.label}
            </button>
          ))}
        </div>

        <div className="pb-safe bg-white shrink-0 dark:bg-slate-900">
          <div className="sticky bottom-0 bg-white p-3 border-t border-slate-200 dark:bg-slate-900 dark:border-slate-700">
            {notice && <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{notice}</p>}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Emit Tutor Bot anything..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 min-h-[44px] max-h-32 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
              <button
                onClick={() => {
                  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  if (!SpeechRecognition) {
                    setNotice('Voice input not supported in this browser.');
                    return;
                  }
                  const recognition = new SpeechRecognition();
                  recognition.lang = 'en-US';
                  recognition.interimResults = false;
                  recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setInput((prev: string) => prev + ' ' + transcript);
                  };
                  recognition.start();
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 transition-colors dark:hover:text-slate-200"
                title="Voice input"
                aria-label="Voice input"
              >
                <Mic className="h-5 w-5" />
              </button>
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || sending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brown-600 hover:bg-brown-700 text-white transition-colors disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}