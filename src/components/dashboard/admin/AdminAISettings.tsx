'use client';

import { useEffect, useState } from 'react';
import {
  Brain,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  TestTube2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageIntro, SectionPanel } from '@/components/dashboard/primitives';
import type { AIProviderConfig } from '@/lib/ai-settings';
import Link from 'next/link';

const KEYS: { field: keyof AIProviderConfig; label: string; placeholder: string; help: string; getKeyUrl: string }[] = [
  { field: 'openaiKey', label: 'OpenAI API key', placeholder: 'sk-...', help: 'Used for premium GPT-4o and fallback GPT-4o-mini.', getKeyUrl: 'https://platform.openai.com/api-keys' },
  { field: 'cerebroKey', label: 'Cerebras API key', placeholder: 'csk-...', help: 'Fastest provider (Llama on Cerebras).', getKeyUrl: 'https://cloud.cerebras.ai' },
  { field: 'deepseekKey', label: 'DeepSeek API key', placeholder: 'sk-...', help: 'Best-quality chat, plus reasoning (R1).', getKeyUrl: 'https://platform.deepseek.com' },
  { field: 'geminiKey', label: 'Google Gemini API key', placeholder: 'AIza...', help: 'Premium Gemini Pro + free Gemini Flash quota.', getKeyUrl: 'https://aistudio.google.com/app/apikey' },
  { field: 'groqKey', label: 'Groq API key', placeholder: 'gsk_...', help: 'Free, ultra-fast Llama models.', getKeyUrl: 'https://console.groq.com/keys' },
  { field: 'openrouterKey', label: 'OpenRouter API key', placeholder: 'sk-or-...', help: 'Paid fallback router to many models.', getKeyUrl: 'https://openrouter.ai/keys' },
  { field: 'dalleKey', label: 'OpenAI DALL-E key', placeholder: 'sk-...', help: 'Image generation (optional).', getKeyUrl: 'https://platform.openai.com/api-keys' },
  { field: 'stabilityKey', label: 'Stability AI key', placeholder: 'sk-...', help: 'Image generation fallback (optional).', getKeyUrl: 'https://platform.stability.ai/account/keys' },
];

const PROVIDERS = [
  { value: '', label: 'Automatic (waterfall)' },
  { value: 'groq', label: 'Groq' },
  { value: 'cerebras', label: 'Cerebras' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'openai', label: 'OpenAI' },
];

export function AdminAISettings() {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [config, setConfig] = useState<AIProviderConfig>({ activeProvider: '', premiumEnabled: true });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/ai-settings', { cache: 'no-store' });
        const json = await res.json();
        if (json.success) setConfig({ ...json.data });
      } catch {
        setError('Failed to load AI settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (field: keyof AIProviderConfig, value: string | boolean) =>
    setConfig((prev) => ({ ...prev, [field]: value }));

  const toggleShowKey = (field: string) => setShowKeys((prev) => ({ ...prev, [field]: !prev[field] }));

  const handleSave = async () => {
    setError('');
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? 'Failed to save AI settings.');
        return;
      }
      setConfig({ ...json.data });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Network error while saving AI settings.');
    }
  };

  const hasKey = config.openaiKey || config.cerebroKey || config.deepseekKey || config.geminiKey || config.groqKey || config.openrouterKey;

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Admin · AI"
        title="AI Provider Configuration"
        subtitle="Configure the AI waterfall (Emit Tutor Bot). Keys are stored server-side and never exposed to the browser."
        actions={
          <>
            <Link href="/dashboard/admin/ai/test" className="btn btn-outline btn-md">
              <TestTube2 aria-hidden="true" className="h-4 w-4" /> Test Suite
            </Link>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </Button>
          </>
        }
      />

      {saved && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          AI settings saved successfully.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-gold-500/25 bg-gold-500/5 px-4 py-3 text-sm text-text-muted">
        <span className="flex items-center gap-1.5 font-medium text-gold-700 dark:text-gold-300">
          <ShieldCheck className="h-3.5 w-3.5" /> How the waterfall works
        </span>
        Calls try the active provider first, then Premium OpenAI (GPT-4o), Premium Gemini, Groq, Cerebras, DeepSeek,
        Gemini Flash, OpenRouter and OpenAI GPT-4o-mini — the first provider with a valid key and a successful response
        wins. With no keys configured, AI features report a clear setup error.
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionPanel title="Provider API Keys" icon={KeyRound}>
          <div className="space-y-4">
            {KEYS.map((keyField) => (
              <div key={keyField.field}>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="label mb-0" htmlFor={`ai-${keyField.field}`}>
                    {keyField.label}
                  </label>
                  <a
                    href={keyField.getKeyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-gold-600 hover:underline dark:text-gold-400"
                  >
                    Get key →
                  </a>
                </div>
                <div className="relative">
                  <input
                    id={`ai-${keyField.field}`}
                    type={showKeys[keyField.field] ? 'text' : 'password'}
                    className="input font-mono text-xs !pr-9"
                    placeholder={keyField.placeholder}
                    value={(config[keyField.field] as string) || ''}
                    onChange={(e) => update(keyField.field, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey(keyField.field)}
                    aria-label={showKeys[keyField.field] ? 'Hide API key' : 'Show API key'}
                    className="absolute inset-y-0 right-0 flex items-center px-2.5 text-text-muted hover:text-text-primary"
                  >
                    {showKeys[keyField.field] ? (
                      <EyeOff aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Eye aria-hidden="true" className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-text-muted">{keyField.help}</p>
              </div>
            ))}
          </div>
        </SectionPanel>

        <div className="space-y-6">
          <SectionPanel title="Waterfall Behavior" icon={SlidersHorizontal}>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="ai-active-provider">Active provider (optional)</label>
                <select
                  id="ai-active-provider"
                  className="input"
                  value={config.activeProvider || ''}
                  onChange={(e) => update('activeProvider', e.target.value)}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-text-muted">
                  When set, this provider is tried first. Leave on Automatic to use the full waterfall.
                </p>
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-line px-3 py-2.5 text-sm">
                <span className="text-text-primary">Use premium models (GPT-4o / Gemini Pro) first</span>
                <span
                  role="switch"
                  aria-checked={config.premiumEnabled !== false}
                  onClick={() => update('premiumEnabled', config.premiumEnabled === false)}
                  className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
                  style={{ backgroundColor: config.premiumEnabled !== false ? 'rgb(var(--gold-500))' : undefined }}
                >
                  <span
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                    style={
                      config.premiumEnabled !== false
                        ? { transform: 'translateX(1rem)' }
                        : { transform: 'translateX(0.125rem)' }
                    }
                  />
                </span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="ai-premium-openai">Premium OpenAI model</label>
                  <input
                    id="ai-premium-openai"
                    className="input font-mono text-xs"
                    value={config.premiumOpenaiModel || 'gpt-4o'}
                    onChange={(e) => update('premiumOpenaiModel', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="ai-premium-gemini">Premium Gemini model</label>
                  <input
                    id="ai-premium-gemini"
                    className="input font-mono text-xs"
                    value={config.premiumGeminiModel || 'gemini-2.0-flash'}
                    onChange={(e) => update('premiumGeminiModel', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel title="Per-task Model Overrides" icon={Brain}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="ai-model-default">Default model</label>
                <input
                  id="ai-model-default"
                  className="input font-mono text-xs"
                  placeholder="auto"
                  value={config.modelDefault || ''}
                  onChange={(e) => update('modelDefault', e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="ai-model-teacher">Teacher tasks</label>
                <input
                  id="ai-model-teacher"
                  className="input font-mono text-xs"
                  placeholder="auto"
                  value={config.modelTeacher || ''}
                  onChange={(e) => update('modelTeacher', e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="ai-model-student">Student tasks</label>
                <input
                  id="ai-model-student"
                  className="input font-mono text-xs"
                  placeholder="auto"
                  value={config.modelStudent || ''}
                  onChange={(e) => update('modelStudent', e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="ai-model-presentation">Presentations</label>
                <input
                  id="ai-model-presentation"
                  className="input font-mono text-xs"
                  placeholder="auto"
                  value={config.modelPresentation || ''}
                  onChange={(e) => update('modelPresentation', e.target.value)}
                />
              </div>
            </div>
          </SectionPanel>

          <div className="rounded-lg border border-gold-500/25 bg-gold-500/5 px-3 py-2.5 text-xs text-text-muted">
            <span className="flex items-center gap-1.5 font-medium text-gold-700 dark:text-gold-300">
              <ShieldCheck className="h-3.5 w-3.5" /> Status
            </span>
            {hasKey ? 'At least one AI provider key is configured — Emit Tutor Bot is ready to answer.' : 'No AI provider keys configured yet. Emit Tutor Bot will not be able to generate answers until a key is added.'}
          </div>
        </div>
      </div>
    </div>
  );
}