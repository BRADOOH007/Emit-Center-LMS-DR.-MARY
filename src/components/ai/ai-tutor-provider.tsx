'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { EmitTutorDrawer } from '@/components/ai/emit-tutor-drawer';

interface AITutorContextValue {
  isOpen: boolean;
  openAITutor: (
    initialPrompt?: string,
    contextSubject?: string,
    contextTopic?: string,
    contextCurriculum?: string,
  ) => void;
  closeAITutor: () => void;
}

const AITutorContext = createContext<AITutorContextValue | null>(null);

export function AITutorProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>();
  const [contextSubject, setContextSubject] = useState<string | undefined>();
  const [contextTopic, setContextTopic] = useState<string | undefined>();
  const [contextCurriculum, setContextCurriculum] = useState<string | undefined>();

  const openAITutor = useCallback(
    (prompt?: string, subject?: string, topic?: string, curriculum?: string) => {
      setInitialPrompt(prompt);
      setContextSubject(subject);
      setContextTopic(topic);
      setContextCurriculum(curriculum);
      setSessionKey((k) => k + 1);
      setIsOpen(true);
    },
    [],
  );

  const closeAITutor = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, openAITutor, closeAITutor }),
    [isOpen, openAITutor, closeAITutor],
  );

  return (
    <AITutorContext.Provider value={value}>
      {children}
      <EmitTutorDrawer
        key={sessionKey}
        open={isOpen}
        onClose={closeAITutor}
        initialPrompt={initialPrompt}
        currentSubject={contextSubject}
        currentTopic={contextTopic}
        currentCurriculum={contextCurriculum}
      />
    </AITutorContext.Provider>
  );
}

export function useAITutor() {
  const ctx = useContext(AITutorContext);
  if (!ctx) throw new Error('useAITutor must be used within an AITutorProvider');
  return ctx;
}