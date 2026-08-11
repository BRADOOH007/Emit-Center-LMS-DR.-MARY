'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  MonitorPlay,
  ClipboardCheck,
  FileArchive,
  HelpCircle,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { MOCK_LESSON_SECTIONS, MOCK_LESSON_CONTENTS, MOCK_COURSES } from '@/lib/mock-data';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const CONTENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  video: MonitorPlay,
  document: FileText,
  assignment: ClipboardCheck,
  scorm: FileArchive,
  quiz: HelpCircle,
  discussion: MessageSquare,
};

export function LessonViewer({ courseId }: { courseId: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(['cnt_0001', 'cnt_0002']));

  const course = MOCK_COURSES.find((c) => c.id === courseId);
  const sections = MOCK_LESSON_SECTIONS;
  const allContents = MOCK_LESSON_CONTENTS.filter((c) => c.courseId === courseId);

  const activeContent = useMemo(
    () => allContents.find((c) => c.id === activeContentId) ?? allContents[0] ?? null,
    [allContents, activeContentId],
  );

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);

  const handleSelectContent = useCallback(
    (contentId: string) => {
      setActiveContentId(contentId);
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.add(contentId);
        return next;
      });
    },
    [],
  );

  return (
    <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-panel border border-line bg-base-surface shadow-card">
      <div className={cn(
        'scrollbar-thin flex shrink-0 flex-col overflow-y-auto border-r border-line transition-[width] duration-200',
        sidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-r-0',
      )}>
        <div className="px-3 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted/70">Course Content</p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary truncate">{course?.title}</p>
        </div>
        <div className="divider" />
        <nav className="flex-1 px-1 pb-4">
          {sections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            const sectionContents = allContents.filter((c) => c.sectionId === section.id).sort((a, b) => a.order - b.order);
            const completedInSection = sectionContents.filter((c) => completedIds.has(c.id)).length;
            return (
              <div key={section.id}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-text-primary hover:bg-line-soft"
                >
                  {isExpanded ? <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" /> : <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" />}
                  <span className="flex-1 truncate">{section.title}</span>
                  {section.duration && (
                    <span className="text-[10px] text-text-muted">{section.duration}</span>
                  )}
                  <span className="text-[10px] text-text-muted">{completedInSection}/{sectionContents.length}</span>
                </button>
                {isExpanded && (
                  <ul className="ml-6 space-y-0.5 pb-1">
                    {sectionContents.map((content) => {
                      const Icon = CONTENT_ICONS[content.type] ?? FileText;
                      const isActive = content.id === activeContentId;
                      const isCompleted = completedIds.has(content.id);
                      return (
                        <li key={content.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectContent(content.id)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-line-soft',
                              isActive && 'bg-gold-500/10 font-medium text-gold-700 dark:text-gold-300',
                              !isActive && 'text-text-muted',
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            ) : (
                              <Circle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{content.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="btn btn-ghost btn-sm"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? (
              <PanelLeftClose aria-hidden="true" className="h-4 w-4" />
            ) : (
              <PanelLeft aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
          <span className="text-xs text-text-muted">
            {activeContent?.type.replace(/^\w/, (c) => c.toUpperCase())}
          </span>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
          {activeContent ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={activeContent.type === 'video' ? 'gold' : activeContent.type === 'assignment' ? 'brown' : 'neutral'}>
                  {activeContent.type}
                </Badge>
                {activeContent.duration && <Badge variant="neutral">{activeContent.duration}</Badge>}
              </div>

              <h2 className="font-display text-xl font-bold text-text-primary">{activeContent.title}</h2>

              {activeContent.type === 'video' && activeContent.embedUrl && (
                <VideoPlayer url={activeContent.embedUrl} title={activeContent.title} />
              )}

              {activeContent.type === 'document' && activeContent.fileUrl && (
                <DocumentViewer url={activeContent.fileUrl} title={activeContent.title} />
              )}

              {activeContent.type === 'assignment' && (
                <AssignmentPanel content={activeContent} />
              )}

              {activeContent.type === 'quiz' && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <HelpCircle aria-hidden="true" className="mb-3 h-14 w-14 text-gold-500" />
                  <h3 className="text-lg font-semibold text-text-primary">Quiz: {activeContent.title}</h3>
                  <p className="mt-1 text-sm text-text-muted">10 questions &middot; Estimated 10 minutes</p>
                  <Button variant="gold" className="mt-4">Start Quiz</Button>
                </div>
              )}

              {activeContent.type === 'scorm' && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileArchive aria-hidden="true" className="mb-3 h-14 w-14 text-gold-500" />
                  <h3 className="text-lg font-semibold text-text-primary">SCORM Module: {activeContent.title}</h3>
                  <p className="mt-1 text-sm text-text-muted">Interactive tutorial &middot; {activeContent.duration}</p>
                  <Button variant="gold" className="mt-4">Launch SCORM Player</Button>
                </div>
              )}

              {activeContent.type === 'discussion' && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageSquare aria-hidden="true" className="mb-3 h-14 w-14 text-gold-500" />
                  <h3 className="text-lg font-semibold text-text-primary">Discussion: {activeContent.title}</h3>
                  <p className="mt-1 text-sm text-text-muted">Join the conversation with your classmates.</p>
                  <Button variant="gold" className="mt-4">View Discussion</Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BookOpen aria-hidden="true" className="mb-3 h-12 w-12 text-text-muted/40" />
              <p className="text-sm font-medium text-text-primary">Select a lesson to begin</p>
              <p className="text-xs text-text-muted">Use the sidebar to navigate course content.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({ url, title }: { url: string; title: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-black">
      <iframe
        src={url}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full"
      />
    </div>
  );
}

function DocumentViewer({ url, title }: { url: string; title: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <iframe
        src={url}
        title={title}
        className="h-[70vh] w-full"
      />
    </div>
  );
}

function AssignmentPanel({ content }: { content: { title: string; embedUrl?: string } }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-line-soft/50 py-12 text-center">
        <ClipboardCheck aria-hidden="true" className="mb-3 h-14 w-14 text-gold-500" />
        <h3 className="text-lg font-semibold text-text-primary">{content.title}</h3>
        <p className="mt-1 text-sm text-text-muted">Lab exercise &middot; Estimated 45 minutes</p>
        {content.embedUrl && (
          <Button variant="gold" className="mt-4" onClick={() => window.open(content.embedUrl, '_blank')}>
            Open Assignment PDF
          </Button>
        )}
      </div>
      <div className="panel">
        <p className="mb-2 text-sm font-semibold text-text-primary">Submission</p>
        <div className="rounded-lg border-2 border-dashed border-line p-6 text-center">
          <p className="text-sm text-text-muted">Drag and drop your file here, or click to browse.</p>
          <p className="mt-1 text-xs text-text-muted">Accepted formats: .pdf, .zip, .ino, .py</p>
          <input type="file" className="mt-3 text-xs" />
        </div>
      </div>
    </div>
  );
}
