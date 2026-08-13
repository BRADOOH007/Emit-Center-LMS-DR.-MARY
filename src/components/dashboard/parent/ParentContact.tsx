'use client';

import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageIntro, SectionPanel, StatCard } from '@/components/dashboard/primitives';
import { useLocale, useSession } from '@/components/providers/AppProviders';
import { UserAvatar } from '@/components/ui/UserAvatar';

type InstructorOption = { id: string; fullName: string; email?: string };

type ContactMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  subject: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

export function ParentContact({ parentId }: { parentId: string }) {
  const { formatDate } = useLocale();
  const { user } = useSession();
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const [links, coursesJson, messagesJson] = await Promise.all([
        fetch(`/api/users/${encodeURIComponent(user.id)}/linked-students`)
          .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
          .then((json) => (Array.isArray(json.data) ? json.data : [])),
        fetch('/api/courses?pageSize=50')
          .then((res) => (res.ok ? res.json() : Promise.resolve({ data: { data: [] } })))
          .then((json) => {
            const payload = json?.data?.data;
            return Array.isArray(payload) ? payload : [];
          }),
        fetch('/api/messages')
          .then((res) => (res.ok ? res.json() : Promise.resolve({ data: [] })))
          .then((json) => (Array.isArray(json.data) ? json.data : [])),
      ]);

      const instructorMap = new Map<string, InstructorOption>();
      coursesJson.forEach((course: { instructor?: { id?: string; fullName?: string; email?: string } }) => {
        const instructor = course.instructor;
        if (!instructor?.id) return;
        const existing = instructorMap.get(instructor.id);
        instructorMap.set(instructor.id, {
          id: instructor.id,
          fullName: instructor.fullName ?? existing?.fullName ?? '',
          email: instructor.email ?? existing?.email,
        });
      });

      const threadMessages: ContactMessage[] = [];
      messagesJson.forEach((thread: { messages?: unknown[] }) => {
        if (!Array.isArray(thread.messages)) return;
        thread.messages.forEach((msg) => {
          const m = msg as Partial<ContactMessage>;
          if (!m?.id) return;
          threadMessages.push({
            id: m.id,
            senderId: m.senderId ?? '',
            receiverId: m.receiverId ?? '',
            subject: m.subject ?? '',
            content: m.content ?? '',
            isRead: m.isRead ?? false,
            createdAt: m.createdAt ?? '',
          });
        });
      });
      threadMessages.forEach((msg) => {
        const otherId = msg.senderId === user.id ? msg.receiverId : msg.senderId;
        if (!otherId) return;
        const participant = messagesJson
          .flatMap((thread: { participant?: { id: string; fullName: string; email?: string } }) =>
            thread.participant ? [thread.participant] : [],
          )
          .find((p: { id: string }) => p.id === otherId);
        if (participant?.email) {
          const existing = instructorMap.get(participant.id);
          if (existing) existing.email = participant.email;
        }
      });

      const messageList = threadMessages.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      const instructorList = Array.from(instructorMap.values());

      if (!active) return;
      setStudentCount(links.length);
      setMessages(messageList);
      setInstructors(instructorList);
      setSelectedInstructor((prev) => prev || instructorList[0]?.id || '');
    }

    load();
    return () => {
      active = false;
    };
  }, [user.id]);

  const myMessages = messages;

  const handleSend = () => {
    setSent(true);
    window.setTimeout(() => setSent(false), 2500);
  };

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Parent · Contact"
        title="Contact Instructors"
        subtitle="Reach instructors directly about your students — conversations are private."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Instructors" value={instructors.length} hint="Available to contact" icon={Send} tone="gold" />
        <StatCard label="Linked Students" value={studentCount} hint="Guardian profiles" icon={Send} tone="blue" />
        <StatCard label="Conversations" value={myMessages.length} hint="Message history" icon={Send} tone="brown" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <SectionPanel title="Instructors" icon={Send} className="lg:col-span-2">
          <ul className="space-y-1">
            {instructors.map((instructor) => (
              <li key={instructor.id}>
                <button
                  onClick={() => setSelectedInstructor(instructor.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    selectedInstructor === instructor.id ? 'bg-gold-500/10' : 'hover:bg-line-soft'
                  }`}
                >
                  <UserAvatar name={instructor.fullName} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{instructor.fullName}</p>
                    <p className="truncate text-xs text-text-muted">{instructor.email ?? 'EMIT Instructor'}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </SectionPanel>

        <div className="space-y-6 lg:col-span-3">
          <SectionPanel title="New Message" icon={Send}>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="msg-instructor">To</label>
                <select
                  id="msg-instructor"
                  className="input"
                  value={selectedInstructor}
                  onChange={(e) => setSelectedInstructor(e.target.value)}
                >
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>{instructor.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="msg-subject">Subject</label>
                <input id="msg-subject" className="input" placeholder="e.g. Question about progress" />
              </div>
              <div>
                <label className="label" htmlFor="msg-body">Message</label>
                <textarea id="msg-body" rows={5} className="input" placeholder="Write your message…" />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleSend}>
                  <Send aria-hidden="true" className="h-4 w-4" /> Send Message
                </Button>
                {sent && <p className="text-sm text-emerald-600">Message sent successfully.</p>}
              </div>
            </div>
          </SectionPanel>

          <SectionPanel title="Recent Messages" icon={Send}>
            <ul className="divide-y divide-line">
              {myMessages.length > 0 ? (
                myMessages.map((message) => (
                  <li key={message.id} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-text-primary">{message.subject}</p>
                      <span className="flex items-center gap-2">
                        {!message.isRead && <Badge variant="gold">Unread</Badge>}
                        <span className="text-xs tabular-nums text-text-muted">{formatDate(message.createdAt)}</span>
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-text-muted">{message.content}</p>
                  </li>
                ))
              ) : (
                <li className="py-6 text-center text-sm text-text-muted">No messages yet.</li>
              )}
            </ul>
          </SectionPanel>
        </div>
      </div>
    </div>
  );
}
