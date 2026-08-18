import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface AnalyzingPageProps {
  step: string;
}

const STEPS = [
  { id: 'validate',  label: 'Image Validation',         desc: 'Format check, size, corruption' },
  { id: 'ocr',       label: 'OCR Text Extraction',       desc: 'Extracting text regions and confidence' },
  { id: 'ela',       label: 'ELA Analysis',              desc: 'Error level analysis on JPEG blocks' },
  { id: 'noise',     label: 'Noise Pattern Analysis',    desc: 'Spatial noise variance mapping' },
  { id: 'layout',    label: 'Layout Analysis',           desc: 'Document structure detection' },
  { id: 'metadata',  label: 'Metadata Extraction',       desc: 'EXIF, software tags, timestamps' },
  { id: 'ml',        label: 'ML Manipulation Detection', desc: 'Classifier inference (if available)' },
  { id: 'fusion',    label: 'Evidence Fusion',           desc: 'Aggregating signal scores' },
];

type StepState = 'done' | 'running' | 'pending';

export function AnalyzingPage({ step }: AnalyzingPageProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  // Auto-advance steps for UI feedback (backend handles real processing)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx(i => Math.min(i + 1, STEPS.length - 1));
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.round(((activeIdx + 1) / STEPS.length) * 100);

  const getStepState = (idx: number): StepState => {
    if (idx < activeIdx) return 'done';
    if (idx === activeIdx) return 'running';
    return 'pending';
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[22px] font-semibold text-[var(--text-primary)] leading-none">
          Forensic Analysis In Progress
        </h2>
        <p className="text-[13px] text-[var(--text-muted)] mt-1.5">
          {step || 'Running multi-signal analysis…'}
        </p>
      </div>

      {/* Overall progress */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-[var(--text-muted)] font-medium">Overall Progress</span>
          <span className="text-[12px] font-mono text-[var(--text-secondary)]">{progress}%</span>
        </div>
        <div className="progress-track" style={{ height: 5 }}>
          <div
            className="progress-fill"
            style={{
              width: `${progress}%`,
              background: 'var(--accent)',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="panel overflow-hidden">
        {STEPS.map((s, idx) => {
          const state = getStepState(idx);
          return (
            <div
              key={s.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-b-0"
              style={{ background: state === 'running' ? 'rgba(79,124,255,0.04)' : undefined }}
            >
              {/* Status icon */}
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                {state === 'done' && (
                  <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                )}
                {state === 'running' && (
                  <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
                )}
                {state === 'pending' && (
                  <Circle className="w-4 h-4 text-[var(--border)]" />
                )}
              </div>

              {/* Labels */}
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-medium leading-none ${
                  state === 'done'    ? 'text-[var(--text-secondary)]' :
                  state === 'running' ? 'text-[var(--text-primary)]' :
                                        'text-[var(--text-muted)]'
                }`}>
                  {s.label}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-none">{s.desc}</p>
              </div>

              {/* Right status text */}
              <span className={`text-[11px] font-medium flex-shrink-0 ${
                state === 'done'    ? 'text-[var(--success)]' :
                state === 'running' ? 'text-[var(--accent)]' :
                                      'text-[var(--text-muted)]'
              }`}>
                {state === 'done' ? 'Done' : state === 'running' ? 'Running' : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[var(--text-muted)] text-center">
        Analysis may take 10–30 seconds depending on image complexity.
      </p>
    </div>
  );
}
