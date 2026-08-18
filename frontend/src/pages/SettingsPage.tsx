import { useState } from 'react';
import {
  Shield, Brain, Monitor, Palette, Bell,
  Database, Key, Save, RotateCcw, AlertCircle, CheckCircle2
} from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabase';

// ── Local storage helpers ────────────────────────────────────────
const STORAGE_KEY = 'verishot_settings';

interface AppSettings {
  theme: 'dark';            // currently only dark is supported
  riskThresholdLow: number; // 0–100
  riskThresholdHigh: number;
  maxHistoryEntries: number;
  showDisclaimerAlways: boolean;
  enableAnimations: boolean;
  defaultImageView: 'original' | 'ela' | 'annotated';
  backendUrl: string;
}

const DEFAULTS: AppSettings = {
  theme:                'dark',
  riskThresholdLow:     30,
  riskThresholdHigh:    60,
  maxHistoryEntries:    100,
  showDisclaimerAlways: true,
  enableAnimations:     true,
  defaultImageView:     'original',
  backendUrl:           '',
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ── Section wrapper ──────────────────────────────────────────────
function Section({ icon, title, children }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="panel-header">
        <span className="text-[var(--text-muted)]">{icon}</span>
        <span className="text-[12px] font-semibold text-[var(--text-secondary)]">{title}</span>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

// ── Row ──────────────────────────────────────────────────────────
function Row({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[var(--text-secondary)]">{label}</p>
        {description && (
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ── Toggle ───────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5.5 rounded-full border transition-colors duration-150 flex-shrink-0 ${
        value
          ? 'bg-[var(--accent)] border-[var(--accent)]'
          : 'bg-[var(--elevated)] border-[var(--border)]'
      }`}
      style={{ height: 22, width: 40 }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-150"
        style={{ transform: value ? 'translateX(18px)' : 'translateX(0)' }}
      />
    </button>
  );
}

// ── Number input ─────────────────────────────────────────────────
function NumberInput({ value, onChange, min, max }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={e => onChange(Number(e.target.value))}
      className="input text-right w-20 font-mono text-[13px]"
    />
  );
}

// ── Main Page ────────────────────────────────────────────────────
export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [saved, setSaved]       = useState(false);

  const update = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) =>
    setSettings(s => ({ ...s, [key]: val }));

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULTS });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h2 className="text-[20px] font-semibold text-[var(--text-primary)] leading-none">Settings</h2>
          <p className="text-[12px] text-[var(--text-muted)] mt-1">
            Application preferences — stored locally in your browser.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="btn btn-ghost text-[12px]">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button onClick={handleSave} className="btn btn-primary text-[12px]">
            {saved
              ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</>
              : <><Save className="w-3.5 h-3.5" /> Save Settings</>
            }
          </button>
        </div>
      </div>

      {/* ── Analysis ── */}
      <Section icon={<Brain className="w-4 h-4" />} title="Analysis">
        <Row
          label="Low Risk Threshold"
          description="Scores at or below this value are classified as Low Risk."
        >
          <NumberInput value={settings.riskThresholdLow} min={0} max={99}
            onChange={v => update('riskThresholdLow', v)} />
        </Row>
        <Row
          label="High Risk Threshold"
          description="Scores above this value are classified as High Risk. Scores in between are Moderate."
        >
          <NumberInput value={settings.riskThresholdHigh} min={1} max={100}
            onChange={v => update('riskThresholdHigh', v)} />
        </Row>
        <Row
          label="Default Image View"
          description="Which forensic view to show first in results."
        >
          <select
            value={settings.defaultImageView}
            onChange={e => update('defaultImageView', e.target.value as AppSettings['defaultImageView'])}
            className="input text-[12px] w-auto pr-6"
          >
            <option value="original">Original</option>
            <option value="ela">ELA</option>
            <option value="annotated">Annotated Regions</option>
          </select>
        </Row>
      </Section>

      {/* ── History ── */}
      <Section icon={<Database className="w-4 h-4" />} title="History">
        <Row
          label="Max History Entries"
          description="Maximum number of analyses stored in the local database. Older entries are discarded."
        >
          <NumberInput value={settings.maxHistoryEntries} min={10} max={500}
            onChange={v => update('maxHistoryEntries', v)} />
        </Row>
      </Section>

      {/* ── Display ── */}
      <Section icon={<Palette className="w-4 h-4" />} title="Display">
        <Row label="Theme" description="Only dark mode is available in this version.">
          <span className="text-[12px] text-[var(--text-muted)] px-2 py-1 rounded border border-[var(--border)] bg-[var(--surface)]">
            Dark
          </span>
        </Row>
        <Row
          label="Animations"
          description="Enable subtle page transition and progress animations."
        >
          <Toggle value={settings.enableAnimations}
            onChange={v => update('enableAnimations', v)} />
        </Row>
        <Row
          label="Always Show Disclaimer"
          description="Display the forensic disclaimer on every results page."
        >
          <Toggle value={settings.showDisclaimerAlways}
            onChange={v => update('showDisclaimerAlways', v)} />
        </Row>
      </Section>

      {/* ── Authentication ── */}
      <Section icon={<Key className="w-4 h-4" />} title="Authentication — Supabase">
        <div
          className={`flex items-start gap-2.5 p-3 rounded-md border text-[12px] ${
            isSupabaseConfigured
              ? 'bg-[var(--success)]/8 border-[var(--success)]/20 text-[var(--success)]'
              : 'bg-[var(--warning)]/8 border-[var(--warning)]/20 text-[var(--warning)]'
          }`}
        >
          {isSupabaseConfigured
            ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            : <AlertCircle  className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          }
          <span>
            {isSupabaseConfigured
              ? 'Supabase is configured and authentication is enabled.'
              : 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env and restart the dev server.'
            }
          </span>
        </div>
        <Row
          label="Configure Credentials"
          description="Supabase credentials are managed via environment variables and cannot be changed here at runtime."
        >
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary text-[12px]"
          >
            Open Dashboard ↗
          </a>
        </Row>
      </Section>

      {/* ── Backend ── */}
      <Section icon={<Monitor className="w-4 h-4" />} title="Backend Connection">
        <Row
          label="API Base URL"
          description="Leave empty to use the default Vite proxy (/api → localhost:8000). Set a custom URL if your backend runs elsewhere."
        >
          <input
            type="text"
            value={settings.backendUrl}
            onChange={e => update('backendUrl', e.target.value)}
            placeholder="/api"
            className="input text-[12px] w-48 font-mono"
          />
        </Row>
        <div className="text-[11px] text-[var(--text-muted)]">
          Current effective endpoint: <code className="text-[var(--accent)] bg-[var(--surface)] px-1 rounded">
            {settings.backendUrl || '/api'}/analyze
          </code>
        </div>
      </Section>

      {/* ── Notifications ── */}
      <Section icon={<Bell className="w-4 h-4" />} title="Notifications">
        <Row
          label="Browser Notifications"
          description="Browser-level notifications are not yet available in this version."
        >
          <span className="text-[12px] text-[var(--text-muted)]">Coming soon</span>
        </Row>
      </Section>

      {/* Save footer */}
      <div className="disclaimer-bar justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <p className="text-[11px] text-[var(--text-muted)]">
            Settings are stored in <code className="text-[var(--accent)] text-[10px]">localStorage</code> and
            never sent to the server.
          </p>
        </div>
        <button onClick={handleSave} className="btn btn-primary text-[12px] flex-shrink-0">
          {saved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save</>}
        </button>
      </div>
    </div>
  );
}
