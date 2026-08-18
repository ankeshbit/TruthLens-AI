import { useState } from 'react';
import {
  RotateCcw, Image as ImageIcon, Activity, Eye, Maximize2,
  AlertTriangle, CheckCircle2, XCircle, Info, FileText,
  MapPin, Shield, AlertCircle, ChevronDown, ChevronRight,
  BarChart3
} from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
         ResponsiveContainer, Tooltip } from 'recharts';
import type { AnalysisResult, RiskLevel, ImageView } from '../types';
import { RISK_LABELS, SCREENSHOT_TYPE_LABELS } from '../types';

interface ResultsPageProps {
  result: AnalysisResult;
  file: File;
  onReset: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────
function getRiskColor(level: RiskLevel) {
  return level === 'likely_genuine'        ? 'var(--success)' :
         level === 'suspicious'            ? 'var(--warning)' :
                                             'var(--danger)';
}

function getSignalStatus(score: number, status: string): { label: string; color: string } {
  if (status !== 'ok') return { label: 'N/A',    color: 'var(--text-muted)' };
  if (score >= 0.65)   return { label: 'High',   color: 'var(--danger)' };
  if (score >= 0.35)   return { label: 'Medium', color: 'var(--warning)' };
  return               { label: 'Normal', color: 'var(--success)' };
}

function ScoreDisplay({ score, level }: { score: number; level: RiskLevel }) {
  const color = getRiskColor(level);
  const label = level === 'likely_genuine' ? 'LOW RISK' :
                level === 'suspicious'     ? 'MODERATE RISK' :
                                             'HIGH RISK';
  const pct = (score / 100) * 100;

  return (
    <div className="flex items-center gap-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
          Risk Score
        </p>
        <p className="text-[48px] font-bold leading-none tabular-nums" style={{ color }}>
          {score}
        </p>
        <p className="text-[12px] text-[var(--text-muted)] mt-0.5">/ 100</p>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[12px] font-bold tracking-wide"
            style={{ color }}
          >
            {label}
          </span>
        </div>
        <div className="progress-track" style={{ height: 6 }}>
          <div
            className="progress-fill"
            style={{
              width: `${pct}%`,
              background: color,
              transition: 'width 1s ease',
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>0 · Low</span>
          <span>30</span>
          <span>60</span>
          <span>100 · High</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export function ResultsPage({ result, file, onReset }: ResultsPageProps) {
  const [imageView, setImageView] = useState<ImageView>('original');
  const [evidenceOpen, setEvidenceOpen] = useState(true);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [originalUrl] = useState(() => URL.createObjectURL(file));

  const riskColor = getRiskColor(result.risk_level);

  const RiskIcon =
    result.risk_level === 'likely_genuine'        ? CheckCircle2 :
    result.risk_level === 'suspicious'            ? AlertTriangle :
                                                    XCircle;

  const currentImageSrc = (() => {
    if (imageView === 'ela'       && result.ela_image_b64)       return `data:image/jpeg;base64,${result.ela_image_b64}`;
    if (imageView === 'gradcam'   && result.gradcam_image_b64)   return `data:image/jpeg;base64,${result.gradcam_image_b64}`;
    if (imageView === 'annotated' && result.annotated_image_b64) return `data:image/jpeg;base64,${result.annotated_image_b64}`;
    return originalUrl;
  })();

  const radarData = [
    { subject: 'ELA',    value: Math.round(result.forensic_signals.ela_score    * 100) },
    { subject: 'Noise',  value: Math.round(result.forensic_signals.noise_score  * 100) },
    { subject: 'Text',   value: Math.round(result.forensic_signals.text_score   * 100) },
    { subject: 'Layout', value: Math.round(result.forensic_signals.layout_score * 100) },
    { subject: 'ML',     value: result.ml_score != null ? Math.round(result.ml_score * 100) : 0 },
  ];

  const signals = [
    { name: 'ELA Analysis',    score: result.forensic_signals.ela_score,    status: result.forensic_signals.ela_status,    desc: 'JPEG compression inconsistencies' },
    { name: 'Noise Analysis',  score: result.forensic_signals.noise_score,  status: result.forensic_signals.noise_status,  desc: 'Spatial noise variance' },
    { name: 'OCR Analysis',    score: result.forensic_signals.text_score,   status: result.forensic_signals.text_status,   desc: 'Text region anomalies' },
    { name: 'Layout Analysis', score: result.forensic_signals.layout_score, status: result.forensic_signals.layout_status, desc: 'Structural anomalies' },
  ];

  return (
    <div className="space-y-4 max-w-screen-lg">

      {/* ── Page header ─── */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h2 className="text-[20px] font-semibold text-[var(--text-primary)] leading-none">
            Forensic Analysis Result
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mt-1">
            {file.name} · {SCREENSHOT_TYPE_LABELS[result.screenshot_type]}
          </p>
        </div>
        <button
          id="analyze-again-btn"
          onClick={onReset}
          className="btn btn-secondary flex-shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Analyze Another
        </button>
      </div>

      {/* ── Risk Assessment ─── */}
      <div
        className="panel p-5"
        style={{ borderLeft: `3px solid ${riskColor}` }}
      >
        <div className="flex items-center gap-2 mb-4">
          <RiskIcon className="w-4 h-4" style={{ color: riskColor }} />
          <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Risk Assessment
          </span>
          <span
            className="ml-auto text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded"
            style={{
              color: riskColor,
              background: `color-mix(in srgb, ${riskColor} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${riskColor} 25%, transparent)`,
            }}
          >
            {RISK_LABELS[result.risk_level]}
          </span>
        </div>
        <ScoreDisplay score={result.risk_score} level={result.risk_level} />
      </div>

      {/* ── Two-column: Signals table + Signal radar ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Signal table */}
        <div className="panel lg:col-span-2 overflow-hidden">
          <div className="panel-header">
            <BarChart3 className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">Forensic Signals</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Signal</th>
                <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Score</th>
                <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"></th>
                <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {signals.map(sig => {
                const ss = getSignalStatus(sig.score, sig.status);
                const scoreVal = sig.status === 'ok' ? Math.round(sig.score * 100) : null;
                return (
                  <tr key={sig.name} className="border-b border-[var(--border)] last:border-b-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-medium text-[var(--text-secondary)]">{sig.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{sig.desc}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[14px] font-mono font-semibold text-[var(--text-primary)]">
                        {scoreVal !== null ? scoreVal : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 w-32">
                      {scoreVal !== null && (
                        <div className="progress-track" style={{ height: 4 }}>
                          <div
                            className="progress-fill"
                            style={{ width: `${scoreVal}%`, background: ss.color }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded"
                        style={{
                          color: ss.color,
                          background: `color-mix(in srgb, ${ss.color} 10%, transparent)`,
                        }}
                      >
                        {ss.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {/* ML row */}
              <tr className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <p className="text-[13px] font-medium text-[var(--text-secondary)]">ML Detection</p>
                  <p className="text-[11px] text-[var(--text-muted)]">Manipulation classifier</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[14px] font-mono font-semibold text-[var(--text-primary)]">
                    {result.ml_available && result.ml_score != null
                      ? Math.round(result.ml_score * 100)
                      : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 w-32">
                  {result.ml_available && result.ml_score != null && (
                    <div className="progress-track" style={{ height: 4 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.round(result.ml_score * 100)}%`,
                          background: getSignalStatus(result.ml_score, 'ok').color,
                        }}
                      />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {result.ml_available && result.ml_score != null ? (
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded"
                      style={{
                        color: getSignalStatus(result.ml_score, 'ok').color,
                        background: `color-mix(in srgb, ${getSignalStatus(result.ml_score, 'ok').color} 10%, transparent)`,
                      }}
                    >
                      {getSignalStatus(result.ml_score, 'ok').label}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[var(--text-muted)]">Unavailable</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Radar chart */}
        <div className="panel overflow-hidden">
          <div className="panel-header">
            <Activity className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">Signal Radar</span>
          </div>
          <div className="p-2">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#667085', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#4A5568', fontSize: 9 }} />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="var(--accent)"
                  fill="var(--accent)"
                  fillOpacity={0.18}
                  strokeWidth={1.5}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                  formatter={(val) => [`${val ?? 0}`, 'Score']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Image Forensics Workspace ─── */}
      <div className="panel overflow-hidden">
        <div className="panel-header justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">Image Forensics</span>
          </div>
          <div className="tab-bar">
            {([
              { id: 'original' as ImageView,  label: 'Original',  icon: <ImageIcon className="w-3 h-3" />,  available: true },
              { id: 'ela' as ImageView,        label: 'ELA',       icon: <Activity  className="w-3 h-3" />,  available: !!result.ela_image_b64 },
              { id: 'gradcam' as ImageView,    label: 'Grad-CAM',  icon: <Eye       className="w-3 h-3" />,  available: !!result.gradcam_image_b64 },
              { id: 'annotated' as ImageView,  label: 'Regions',   icon: <Maximize2 className="w-3 h-3" />,  available: !!result.annotated_image_b64 },
            ] as const).map(v => (
              <button
                key={v.id}
                id={`view-${v.id}`}
                className={`tab-btn ${imageView === v.id ? 'active' : ''} ${!v.available ? 'disabled' : ''}`}
                onClick={() => v.available && setImageView(v.id)}
                disabled={!v.available}
                aria-pressed={imageView === v.id}
              >
                {v.icon}
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="image-canvas">
          <img
            key={imageView}
            src={currentImageSrc}
            alt={`${imageView} forensic view`}
            className="max-h-96 max-w-full object-contain rounded"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
          />
        </div>

        {imageView !== 'original' && (
          <div className="px-4 py-2 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
            {imageView === 'ela'      && 'ELA: Bright pixels indicate different JPEG compression history — possible editing.'}
            {imageView === 'gradcam'  && 'Grad-CAM: Model attention map. Highlighted regions influenced classifier output.'}
            {imageView === 'annotated' && 'Annotated: Suspected high-risk regions flagged by forensic analysis.'}
          </div>
        )}
      </div>

      {/* ── Suspicious Regions ─── */}
      <div className="panel overflow-hidden">
        <div className="panel-header">
          <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-[12px] font-medium text-[var(--text-secondary)]">Suspicious Regions</span>
          <span className="ml-auto text-[11px] text-[var(--text-muted)]">
            {result.suspicious_regions.length} flagged
          </span>
        </div>

        {result.suspicious_regions.length === 0 ? (
          <div className="px-4 py-3">
            <p className="text-[12px] text-[var(--text-muted)]">
              No specific regions flagged. Forensic signals did not identify localized anomalies.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Region</th>
                <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Coordinates</th>
                <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Confidence</th>
                <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Reason</th>
              </tr>
            </thead>
            <tbody>
              {result.suspicious_regions.map((r, i) => (
                <tr key={i} className="border-b border-[var(--border)] last:border-b-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-[13px] font-medium text-[var(--text-secondary)]">
                    {r.label || `Region #${i + 1}`}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--text-muted)]">
                    ({r.bbox[0]}, {r.bbox[1]}) {r.bbox[2]}×{r.bbox[3]}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`text-[12px] font-mono font-semibold ${
                      r.confidence > 0.7 ? 'text-[var(--danger)]' :
                      r.confidence > 0.4 ? 'text-[var(--warning)]' :
                                           'text-[var(--text-secondary)]'
                    }`}>
                      {Math.round(r.confidence * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-[var(--text-muted)]">
                    {r.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── OCR Results ─── */}
      <div className="panel overflow-hidden">
        <button
          className="panel-header w-full text-left hover:bg-white/[0.02] transition-colors"
          onClick={() => setOcrOpen(o => !o)}
          aria-expanded={ocrOpen}
        >
          <FileText className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-[12px] font-medium text-[var(--text-secondary)]">
            OCR Extracted Text
          </span>
          <span className="ml-2 text-[11px] text-[var(--text-muted)]">
            {result.ocr_results.length} items
          </span>
          <span className="ml-auto">
            {ocrOpen
              ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            }
          </span>
        </button>

        {ocrOpen && (
          result.ocr_results.length === 0 ? (
            <div className="px-4 py-3">
              <p className="text-[12px] text-[var(--text-muted)]">No text detected in this image.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Extracted Text</th>
                  <th className="text-right px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {result.ocr_results.slice(0, 20).map((item, i) => (
                  <tr key={i} className="border-b border-[var(--border)] last:border-b-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-2 font-mono text-[12px] text-[var(--text-secondary)]">
                      {item.text}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={`text-[12px] font-mono font-semibold ${
                        item.confidence >= 0.8 ? 'text-[var(--success)]' :
                        item.confidence >= 0.5 ? 'text-[var(--warning)]' :
                                                 'text-[var(--danger)]'
                      }`}>
                        {Math.round(item.confidence * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* ── Metadata ─── */}
      <div className="panel overflow-hidden">
        <div className="panel-header">
          <Info className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-[12px] font-medium text-[var(--text-secondary)]">File Metadata</span>
        </div>
        <table className="meta-table w-full">
          <tbody>
            <tr>
              <td>File Name</td>
              <td>{file.name}</td>
            </tr>
            <tr>
              <td>Format</td>
              <td>{file.type || 'Unknown'}</td>
            </tr>
            <tr>
              <td>File Size</td>
              <td>{(file.size / 1024 / 1024).toFixed(2)} MB</td>
            </tr>
            {result.metadata.image_width && result.metadata.image_height && (
              <tr>
                <td>Dimensions</td>
                <td>{result.metadata.image_width} × {result.metadata.image_height} px</td>
              </tr>
            )}
            <tr>
              <td>Color Profile</td>
              <td>{result.metadata.color_profile || '—'}</td>
            </tr>
            <tr>
              <td>EXIF Data</td>
              <td>{result.metadata.has_exif ? 'Present' : 'None'}</td>
            </tr>
            <tr>
              <td>Software</td>
              <td>{result.metadata.software || '—'}</td>
            </tr>
            <tr>
              <td>Creation Date</td>
              <td>{result.metadata.creation_date || '—'}</td>
            </tr>
            <tr>
              <td>Modification</td>
              <td>{result.metadata.modification_date || '—'}</td>
            </tr>
            {result.metadata.camera_make && (
              <tr>
                <td>Camera</td>
                <td>{result.metadata.camera_make} {result.metadata.camera_model || ''}</td>
              </tr>
            )}
          </tbody>
        </table>
        {result.metadata.warnings.length > 0 && (
          <div className="px-3 py-2 border-t border-[var(--border)]">
            {result.metadata.warnings.map((w, i) => (
              <p key={i} className="text-[11px] text-[var(--warning)] flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {w}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* ── Forensic Evidence ─── */}
      <div className="panel overflow-hidden">
        <button
          className="panel-header w-full text-left hover:bg-white/[0.02] transition-colors"
          onClick={() => setEvidenceOpen(o => !o)}
          aria-expanded={evidenceOpen}
        >
          <Shield className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-[12px] font-medium text-[var(--text-secondary)]">
            Forensic Evidence Summary
          </span>
          <span className="ml-auto">
            {evidenceOpen
              ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            }
          </span>
        </button>
        {evidenceOpen && (
          <div className="px-4 py-2">
            {result.explanation.map((finding, i) => (
              <div key={i} className="evidence-item">
                <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                  style={{ background: 'var(--accent)' }} />
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{finding}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ML Model Status ─── */}
      {!result.ml_available && (
        <div className="panel p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded flex items-center justify-center bg-[var(--surface)] border border-[var(--border)] flex-shrink-0">
              <Activity className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[13px] font-semibold text-[var(--text-secondary)]">
                  Manipulation Classifier
                </p>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]">
                  Not configured
                </span>
              </div>
              <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
                Current analysis uses forensic signal modules: ELA, Noise, OCR, and Layout.
                To enable ML detection, train the classifier:{' '}
                <code className="text-[var(--accent)] bg-[var(--surface)] px-1 rounded text-[11px]">
                  python ml/train.py
                </code>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['ELA', 'Noise', 'OCR', 'Layout', 'Metadata'].map(m => (
                  <span
                    key={m}
                    className="text-[11px] px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Warnings ─── */}
      {result.warnings.length > 0 && (
        <div className="panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)]" />
            <span className="text-[12px] font-semibold text-[var(--text-secondary)]">Analysis Notes</span>
          </div>
          <ul className="space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i} className="text-[12px] text-[var(--text-muted)]">— {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Disclaimer ─── */}
      <div className="disclaimer-bar" role="note">
        <AlertCircle className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          <strong className="text-[var(--text-secondary)] font-medium">Forensic Disclaimer:</strong>{' '}
          VeriShot AI provides a forensic risk assessment, not definitive proof of authenticity or fraud.
          A high risk score does not confirm manipulation; a low score does not guarantee authenticity.
          Use as one factor among many when evaluating document authenticity.
        </p>
      </div>
    </div>
  );
}
