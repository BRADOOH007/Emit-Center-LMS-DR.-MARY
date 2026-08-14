'use client';

import { useState } from 'react';
import {
  Brain,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Zap,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';

type TestType = 'chat' | 'lesson_plan' | 'unit_plan' | 'presentation' | 'quiz';

interface TestResult {
  testType: TestType;
  provider: string;
  model: string;
  latencyMs: number;
  success: boolean;
  output: string;
  error?: string;
  tokens?: number;
}

const TESTS: { id: TestType; label: string; icon: string; desc: string }[] = [
  { id: 'chat', label: 'AI Chat', icon: '💬', desc: 'Basic chat with the AI assistant' },
  { id: 'lesson_plan', label: 'Lesson Plan', icon: '📖', desc: 'Generate a Common Core lesson plan' },
  { id: 'unit_plan', label: 'Unit Plan', icon: '📋', desc: 'Generate a 4-week unit plan' },
  { id: 'presentation', label: 'Presentation Content', icon: '🎨', desc: 'Generate presentation slide content' },
  { id: 'quiz', label: 'Quiz Generation', icon: '📝', desc: 'Generate a 5-question multiple choice quiz' },
];

export function AITestSuite() {
  const [running, setRunning] = useState<TestType | null>(null);
  const [results, setResults] = useState<Record<TestType, TestResult | null>>({} as any);
  const [expanded, setExpanded] = useState<TestType | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [customResult, setCustomResult] = useState<{ output: string; provider: string; latencyMs: number } | null>(null);
  const [sendingCustom, setSendingCustom] = useState(false);

  const runTest = async (testType: TestType) => {
    setRunning(testType);
    const start = Date.now();

    try {
      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType }),
      });
      const data = await response.json();
      const payload = data.success ? data.data : data;

      const result: TestResult = {
        testType,
        success: payload?.success === true,
        provider: payload?.provider || 'unknown',
        model: payload?.model || 'unknown',
        latencyMs: payload?.latencyMs ?? Date.now() - start,
        output: payload?.output || payload?.error || 'No response',
        error: payload?.error,
        tokens: payload?.tokensUsed,
      };
      setResults((prev) => ({ ...prev, [testType]: result }));
      setExpanded(testType);
    } catch (e: any) {
      setResults((prev) => ({
        ...prev,
        [testType]: {
          testType,
          success: false,
          provider: 'error',
          model: 'error',
          latencyMs: Date.now() - start,
          output: '',
          error: e.message,
        },
      }));
    } finally {
      setRunning(null);
    }
  };

  const runAll = async () => {
    for (const test of TESTS) {
      await runTest(test.id);
      await new Promise((r) => setTimeout(r, 500));
    }
  };

  const sendCustom = async () => {
    if (!customPrompt.trim()) return;
    setSendingCustom(true);
    const start = Date.now();
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType: 'chat', message: customPrompt }),
      });
      const data = await res.json();
      const payload = data.success ? data.data : data;
      setCustomResult({
        output: payload?.output || payload?.error || 'No response',
        provider: payload?.provider || 'unknown',
        latencyMs: payload?.latencyMs ?? Date.now() - start,
      });
    } finally {
      setSendingCustom(false);
    }
  };

  const passed = Object.values(results).filter((r) => r?.success).length;
  const failed = Object.values(results).filter((r) => r && !r.success).length;
  const total = Object.values(results).filter((r) => r).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="header-kicker">Admin · AI</p>
          <h1 className="page-title mt-1">AI Test Suite</h1>
          <p className="page-subtitle mt-1">Verify the AI waterfall is working for each capability</p>
        </div>
        <button onClick={runAll} disabled={!!running} className="btn btn-brown btn-md">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {running ? `Testing ${running}...` : 'Run All Tests'}
        </button>
      </div>

      {total > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="panel text-center">
            <p className="font-display text-2xl font-bold text-text-primary">{total}</p>
            <p className="text-xs text-text-muted">Tests Run</p>
          </div>
          <div className="panel border-emerald-500/40 text-center">
            <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">{passed}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Passed</p>
          </div>
          <div className="panel text-center">
            <p className="font-display text-2xl font-bold text-red-600 dark:text-red-400">{failed}</p>
            <p className="text-xs text-text-muted">Failed</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {TESTS.map((test) => {
          const result = results[test.id];
          const isRunning = running === test.id;
          const isExpanded = expanded === test.id;

          return (
            <div key={test.id} className="panel overflow-hidden p-0">
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="text-xl">{test.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text-primary">{test.label}</p>
                  <p className="text-xs text-text-muted">{test.desc}</p>
                </div>

                {result && (
                  <div className="flex shrink-0 items-center gap-2">
                    {result.success ? (
                      <span className="badge badge-success">
                        <CheckCircle className="h-3 w-3" /> Passed
                      </span>
                    ) : (
                      <span className="badge badge-danger">
                        <XCircle className="h-3 w-3" /> Failed
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <Clock className="h-3 w-3" /> {(result.latencyMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                )}

                <button
                  onClick={() => runTest(test.id)}
                  disabled={!!running}
                  className="btn btn-ghost btn-sm shrink-0"
                >
                  {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {isRunning ? 'Running...' : result ? 'Re-run' : 'Run'}
                </button>

                {result && (
                  <button onClick={() => setExpanded(isExpanded ? null : test.id)} className="text-text-muted hover:text-text-primary">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
              </div>

              {result && isExpanded && (
                <div className="border-t border-line px-5 py-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="badge badge-gold">Provider: {result.provider}</span>
                    <span className="badge badge-neutral">Model: {result.model}</span>
                    {result.tokens && <span className="badge badge-success">{result.tokens} tokens</span>}
                  </div>
                  {result.error && (
                    <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300 font-mono">
                      Error: {result.error}
                    </div>
                  )}
                  {result.output && (
                    <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-line-soft/40 p-4 text-xs leading-relaxed text-text-primary">
                      {result.output}
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold-600 dark:text-gold-400" />
          <h2 className="font-semibold text-text-primary">Custom Prompt Test</h2>
          <span className="text-xs text-text-muted">Test any prompt directly against the AI waterfall</span>
        </div>
        <div className="flex gap-3">
          <input
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendCustom()}
            placeholder="Type any prompt and press Enter or click Send..."
            className="input"
          />
          <button onClick={sendCustom} disabled={sendingCustom || !customPrompt.trim()} className="btn btn-brown btn-md shrink-0">
            {sendingCustom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sendingCustom ? 'Sending...' : 'Send'}
          </button>
        </div>

        {customResult && (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="badge badge-gold">{customResult.provider}</span>
              <span className="flex items-center gap-1 text-xs text-text-muted">
                <Clock className="h-3 w-3" /> {(customResult.latencyMs / 1000).toFixed(1)}s
              </span>
            </div>
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-line-soft/40 p-4 text-sm leading-relaxed text-text-primary">
              {customResult.output}
            </pre>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Brain className="h-4 w-4" />
        The waterfall tries providers in order of preference and returns the first successful response.
      </div>
    </div>
  );
}