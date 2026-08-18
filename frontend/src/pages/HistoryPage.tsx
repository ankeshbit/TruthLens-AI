import { useState, useEffect } from 'react';
import { Trash2, AlertCircle, CheckCircle2, AlertTriangle, XCircle, RotateCcw, History, ScanSearch } from 'lucide-react';
import { getHistory, clearHistory } from '../services/api';
import type { HistoryEntry } from '../types';
import { RISK_LABELS, SCREENSHOT_TYPE_LABELS } from '../types';

export function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHistory();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all analysis history? This cannot be undone.')) return;
    setClearing(true);
    try {
      await clearHistory();
      setEntries([]);
    } catch {
      setError('Failed to clear history');
    } finally {
      setClearing(false);
    }
  };

  const getRiskIcon = (level: string) => {
    if (level === 'likely_genuine') return <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />;
    if (level === 'suspicious')     return <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)]" />;
    return <XCircle className="w-3.5 h-3.5 text-[var(--danger)]" />;
  };

  const getRiskColor = (level: string) =>
    level === 'likely_genuine' ? 'var(--success)' :
    level === 'suspicious'     ? 'var(--warning)' :
                                 'var(--danger)';

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-screen-lg space-y-4">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h2 className="text-[20px] font-semibold text-[var(--text-primary)] leading-none">
            Analysis History
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mt-1">
            Previous forensic analyses — no screenshot images are stored.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadHistory}
            disabled={loading}
            className="btn btn-ghost"
            aria-label="Refresh history"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {entries.length > 0 && (
            <button
              id="clear-history-btn"
              onClick={handleClearHistory}
              disabled={clearing}
              className="btn btn-danger"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearing ? 'Clearing…' : 'Clear All'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="panel overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)] last:border-b-0">
              <div className="shimmer w-4 h-4 rounded-full" />
              <div className="shimmer h-3 w-40 rounded" />
              <div className="shimmer h-3 w-24 rounded ml-auto" />
              <div className="shimmer h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="panel p-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0" />
          <div>
            <p className="text-[13px] text-[var(--text-secondary)]">{error}</p>
            <button onClick={loadHistory} className="text-[12px] text-[var(--accent)] hover:underline mt-1">
              Retry
            </button>
          </div>
        </div>
      ) : entries.length === 0 ? (
        /* Empty state */
        <div className="panel p-10 flex flex-col items-center text-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
            <History className="w-5 h-5 text-[var(--text-muted)]" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-[var(--text-secondary)]">No analyses yet</p>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
              Your completed forensic analyses will appear here.
            </p>
          </div>
          <a
            href="/"
            className="btn btn-secondary mt-1"
            onClick={(e) => { e.preventDefault(); window.location.reload(); }}
          >
            <ScanSearch className="w-3.5 h-3.5" />
            Analyze Screenshot
          </a>
        </div>
      ) : (
        /* History table */
        <div className="panel overflow-hidden">
          <table className="history-table w-full">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Filename</th>
                <th>Type</th>
                <th>Risk</th>
                <th className="text-right">Score</th>
                {entries.some(e => e.ml_score != null) && (
                  <th className="text-right">ML</th>
                )}
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id}>
                  <td>
                    <span className="text-[12px] font-mono text-[var(--text-muted)]">
                      {formatDate(entry.timestamp)}
                    </span>
                  </td>
                  <td>
                    <p className="text-[13px] font-medium text-[var(--text-secondary)] truncate max-w-[180px]">
                      {entry.filename}
                    </p>
                  </td>
                  <td>
                    <span className="text-[12px] text-[var(--text-muted)]">
                      {SCREENSHOT_TYPE_LABELS[entry.screenshot_type as keyof typeof SCREENSHOT_TYPE_LABELS] || entry.screenshot_type}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {getRiskIcon(entry.risk_level)}
                      <span
                        className="text-[12px] font-medium"
                        style={{ color: getRiskColor(entry.risk_level) }}
                      >
                        {RISK_LABELS[entry.risk_level as keyof typeof RISK_LABELS] || entry.risk_level}
                      </span>
                    </div>
                  </td>
                  <td className="text-right">
                    <span
                      className="text-[15px] font-bold font-mono tabular-nums"
                      style={{ color: getRiskColor(entry.risk_level) }}
                    >
                      {entry.risk_score}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] ml-0.5">/100</span>
                  </td>
                  {entries.some(e => e.ml_score != null) && (
                    <td className="text-right">
                      <span className="text-[12px] font-mono text-[var(--text-muted)]">
                        {entry.ml_score != null ? `${Math.round(entry.ml_score * 100)}%` : '—'}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-2 border-t border-[var(--border)]">
            <p className="text-[11px] text-[var(--text-muted)]">
              {entries.length} {entries.length === 1 ? 'analysis' : 'analyses'} recorded
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
