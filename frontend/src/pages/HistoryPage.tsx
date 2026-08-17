import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Trash2, AlertCircle, CheckCircle, AlertTriangle, Clock, FileText } from 'lucide-react';
import { getHistory, clearHistory } from '../services/api';
import type { HistoryEntry } from '../types';
import { RISK_LABELS, SCREENSHOT_TYPE_LABELS } from '../types';

export function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all analysis history? This cannot be undone.')) return;
    setClearing(true);
    try {
      await clearHistory();
      setEntries([]);
    } catch (err) {
      setError('Failed to clear history');
    } finally {
      setClearing(false);
    }
  };

  const getRiskIcon = (level: string) => {
    if (level === 'likely_genuine') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (level === 'suspicious') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    return <AlertCircle className="w-4 h-4 text-red-400" />;
  };

  const getRiskColor = (level: string) => {
    if (level === 'likely_genuine') return 'text-green-400';
    if (level === 'suspicious') return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <motion.div
      key="history"
      className="max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <History className="w-6 h-6 text-brand-400" />
            Analysis History
          </h1>
          <p className="text-surface-500 text-sm mt-1">
            Previous analyses (no screenshots stored)
          </p>
        </div>
        {entries.length > 0 && (
          <button
            id="clear-history-btn"
            onClick={handleClearHistory}
            disabled={clearing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl
                       bg-red-500/10 hover:bg-red-500/20 border border-red-500/20
                       text-red-400 text-sm font-medium transition-all"
          >
            <Trash2 className="w-4 h-4" />
            {clearing ? 'Clearing...' : 'Clear All'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-5 shimmer h-24" />
          ))}
        </div>
      ) : error ? (
        <div className="glass rounded-2xl p-8 text-center border border-red-500/20">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-300">{error}</p>
          <button onClick={loadHistory} className="mt-4 text-sm text-brand-400 hover:underline">
            Retry
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <FileText className="w-16 h-16 text-surface-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-surface-400 mb-2">No History Yet</h3>
          <p className="text-surface-600 text-sm">
            Analyze your first screenshot to see results here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              className="glass rounded-2xl p-5 hover:border-surface-600 transition-all"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${entry.risk_level === 'likely_genuine' ? 'bg-green-500/10' :
                      entry.risk_level === 'suspicious' ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                    {getRiskIcon(entry.risk_level)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-surface-200 font-medium truncate">{entry.filename}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-surface-500 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                      <span className="text-surface-600 text-xs">
                        {SCREENSHOT_TYPE_LABELS[entry.screenshot_type as keyof typeof SCREENSHOT_TYPE_LABELS] || entry.screenshot_type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {entry.ml_score != null && (
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-surface-500">ML Score</p>
                      <p className="text-sm font-mono text-brand-300">
                        {Math.round(entry.ml_score * 100)}%
                      </p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-xs text-surface-500">Risk Score</p>
                    <p className={`text-xl font-bold ${getRiskColor(entry.risk_level)}`}>
                      {entry.risk_score}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-semibold
                    ${entry.risk_level === 'likely_genuine' ? 'bg-green-500/10 text-green-400' :
                      entry.risk_level === 'suspicious' ? 'bg-amber-500/10 text-amber-400' : 
                      'bg-red-500/10 text-red-400'}`}>
                    {RISK_LABELS[entry.risk_level as keyof typeof RISK_LABELS] || entry.risk_level}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
