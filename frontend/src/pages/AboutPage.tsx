import { useState, useEffect } from 'react';
import {
  Shield, Cpu, FileSearch, Eye, Activity, Zap, Database,
  GitBranch, Globe, AlertCircle, CheckCircle2, Loader2,
  ExternalLink, ScanSearch
} from 'lucide-react';
import { getHealth } from '../services/api';
import type { HealthStatus } from '../types';

const APP_VERSION = '1.0.0';

const FORENSIC_MODULES = [
  { name: 'ELA Analysis',       icon: <Activity className="w-4 h-4" />,   desc: 'Error Level Analysis detects JPEG compression inconsistencies caused by re-saving or editing.' },
  { name: 'Noise Analysis',     icon: <Zap       className="w-4 h-4" />,   desc: 'Spatial noise variance mapping to detect regions with inconsistent sensor noise patterns.' },
  { name: 'OCR Extraction',     icon: <FileSearch className="w-4 h-4" />,  desc: 'Optical character recognition with per-token confidence scoring for text anomaly detection.' },
  { name: 'Layout Analysis',    icon: <Eye        className="w-4 h-4" />,  desc: 'Document structure and region detection to identify layout-level manipulation indicators.' },
  { name: 'Metadata Analysis',  icon: <Database   className="w-4 h-4" />,  desc: 'EXIF extraction including software signatures, timestamps, and camera metadata.' },
  { name: 'ML Detection',       icon: <Cpu        className="w-4 h-4" />,  desc: 'EfficientNet-B0 manipulation classifier trained on genuine and manipulated screenshot pairs.' },
];

const TECH_STACK = [
  { layer: 'Frontend',          tech: 'React 18 + Vite + TypeScript + Tailwind CSS' },
  { layer: 'Animation',         tech: 'Framer Motion' },
  { layer: 'Backend',           tech: 'FastAPI + Uvicorn + Python 3.10+' },
  { layer: 'ML Model',          tech: 'PyTorch + EfficientNet-B0 + torchvision' },
  { layer: 'OCR',               tech: 'EasyOCR (English)' },
  { layer: 'Computer Vision',   tech: 'OpenCV + Pillow + NumPy' },
  { layer: 'Storage',           tech: 'SQLite (analysis history only, no images)' },
  { layer: 'Authentication',    tech: 'Supabase (optional)' },
];

const FORENSIC_WEIGHTS = [
  { module: 'ML Detection',    weight: 40, color: 'var(--accent)' },
  { module: 'ELA Analysis',    weight: 20, color: '#6D8DFF' },
  { module: 'Text Analysis',   weight: 15, color: '#22C55E' },
  { module: 'Layout Analysis', weight: 15, color: '#F59E0B' },
  { module: 'Noise Analysis',  weight: 10, color: '#EF4444' },
];

export function AboutPage() {
  const [health, setHealth]       = useState<HealthStatus | null>(null);
  const [healthLoading, setHL]    = useState(true);
  const [healthError, setHE]      = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHealth()
      .then(h  => { if (!cancelled) { setHealth(h); setHL(false); } })
      .catch(() => { if (!cancelled) { setHE(true); setHL(false); } });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="mb-2">
        <h2 className="text-[20px] font-semibold text-[var(--text-primary)] leading-none">About VeriShot AI</h2>
        <p className="text-[12px] text-[var(--text-muted)] mt-1">
          Digital forensics platform for screenshot authenticity analysis.
        </p>
      </div>

      {/* Identity card */}
      <div className="panel p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg overflow-hidden border border-[var(--border)] flex-shrink-0">
            <img src="/logo.png" alt="VeriShot AI" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">VeriShot AI</h3>
              <span className="badge badge-accent">v{APP_VERSION}</span>
            </div>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5 font-mono">
              Digital Forensics · Screenshot Authenticity Analysis
            </p>
            <p className="text-[13px] text-[var(--text-secondary)] mt-2 leading-relaxed">
              VeriShot AI is a multi-signal forensic analysis platform that helps identify whether screenshots —
              payment confirmations, bank transactions, invoices, and receipts — show signs of digital manipulation.
            </p>
            <p className="text-[12px] text-[var(--text-muted)] mt-2 italic">
              "Verify before you trust."
            </p>
          </div>
        </div>
      </div>

      {/* Engine status */}
      <div className="panel overflow-hidden">
        <div className="panel-header">
          <Cpu className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-[12px] font-semibold text-[var(--text-secondary)]">Engine Status</span>
        </div>
        <div className="p-4 space-y-3">
          {healthLoading ? (
            <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking engine…
            </div>
          ) : healthError ? (
            <div className="flex items-center gap-2 text-[12px] text-[var(--danger)]">
              <AlertCircle className="w-3.5 h-3.5" /> Backend unreachable. Ensure the FastAPI server is running.
            </div>
          ) : health ? (
            <table className="meta-table w-full">
              <tbody>
                <tr>
                  <td>Status</td>
                  <td>
                    <span className="flex items-center gap-1.5 text-[var(--success)]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {health.status}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Backend Version</td>
                  <td>{health.version}</td>
                </tr>
                <tr>
                  <td>ML Model</td>
                  <td>
                    <span className={health.ml_model_loaded ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>
                      {health.ml_model_loaded ? '✓ Loaded' : '⚠ Not configured'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>OCR Engine</td>
                  <td>
                    <span className={health.ocr_available ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                      {health.ocr_available ? '✓ Available' : '✗ Unavailable'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : null}
        </div>
      </div>

      {/* Forensic modules */}
      <div className="panel overflow-hidden">
        <div className="panel-header">
          <ScanSearch className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-[12px] font-semibold text-[var(--text-secondary)]">Forensic Modules</span>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {FORENSIC_MODULES.map(m => (
            <div key={m.name} className="flex items-start gap-3 px-4 py-3">
              <div className="w-7 h-7 rounded bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 text-[var(--text-muted)]">
                {m.icon}
              </div>
              <div>
                <p className="text-[13px] font-medium text-[var(--text-secondary)]">{m.name}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence weights */}
      <div className="panel overflow-hidden">
        <div className="panel-header">
          <Activity className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-[12px] font-semibold text-[var(--text-secondary)]">Signal Weights</span>
          <span className="ml-auto text-[11px] text-[var(--text-muted)]">Used for risk score calculation</span>
        </div>
        <div className="p-4 space-y-3">
          {FORENSIC_WEIGHTS.map(w => (
            <div key={w.module} className="space-y-1">
              <div className="flex justify-between text-[12px]">
                <span className="text-[var(--text-secondary)]">{w.module}</span>
                <span className="font-mono font-semibold" style={{ color: w.color }}>{w.weight}%</span>
              </div>
              <div className="progress-track" style={{ height: 4 }}>
                <div className="progress-fill" style={{ width: `${w.weight}%`, background: w.color }} />
              </div>
            </div>
          ))}
          <p className="text-[11px] text-[var(--text-muted)] pt-1">
            * Weights are initial heuristics. ML weight is redistributed proportionally when the model is unavailable.
          </p>
        </div>
      </div>

      {/* Tech stack */}
      <div className="panel overflow-hidden">
        <div className="panel-header">
          <GitBranch className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-[12px] font-semibold text-[var(--text-secondary)]">Technology Stack</span>
        </div>
        <table className="meta-table w-full">
          <tbody>
            {TECH_STACK.map(t => (
              <tr key={t.layer}>
                <td>{t.layer}</td>
                <td>{t.tech}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Links */}
      <div className="panel overflow-hidden">
        <div className="panel-header">
          <Globe className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-[12px] font-semibold text-[var(--text-secondary)]">Resources</span>
        </div>
        <div className="p-4 flex flex-wrap gap-2">
          {[
            { label: 'GitHub Repository',  href: 'https://github.com/ankeshbit/TruthLens-AI' },
            { label: 'API Documentation',  href: 'http://localhost:8000/docs' },
            { label: 'Supabase Dashboard', href: 'https://supabase.com/dashboard' },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-[12px]"
            >
              <ExternalLink className="w-3 h-3" />
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="disclaimer-bar" role="note">
        <Shield className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          <strong className="text-[var(--text-secondary)] font-medium">Forensic Disclaimer:</strong>{' '}
          VeriShot AI provides a forensic risk assessment, not definitive proof of authenticity or fraud.
          Results should be considered alongside other evidence and professional judgement.
        </p>
      </div>
    </div>
  );
}
