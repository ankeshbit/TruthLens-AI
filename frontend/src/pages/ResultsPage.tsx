import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, CheckCircle, AlertCircle,
  RefreshCw, Eye, Zap, Activity, Shield,
  ChevronDown, ChevronUp, Info, FileText,
  Image as ImageIcon, BarChart2
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

// Signal level classification
function getSignalLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 0.65) return { label: 'HIGH', color: 'text-red-400', bg: 'bg-red-500/10' };
  if (score >= 0.35) return { label: 'MEDIUM', color: 'text-amber-400', bg: 'bg-amber-500/10' };
  return { label: 'NORMAL', color: 'text-green-400', bg: 'bg-green-500/10' };
}

function RiskGauge({ score, level }: { score: number; level: RiskLevel }) {
  const color = level === 'likely_genuine' ? '#22c55e' 
               : level === 'suspicious' ? '#f59e0b' 
               : '#ef4444';

  return (
    <div className="relative w-48 h-28 mx-auto">
      {/* Gauge background arc */}
      <svg viewBox="0 0 200 120" className="w-full h-full">
        {/* Background track */}
        <path
          d="M 20 110 A 90 90 0 0 1 180 110"
          fill="none"
          stroke="rgba(51,65,85,0.8)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Colored arc based on score */}
        <motion.path
          d="M 20 110 A 90 90 0 0 1 180 110"
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray="283"
          initial={{ strokeDashoffset: 283 }}
          animate={{ strokeDashoffset: 283 - (score / 100) * 283 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
        />
        {/* Zone markers */}
        <text x="15" y="120" fill="#22c55e" fontSize="10" fontWeight="600">0</text>
        <text x="92" y="25" fill="#f59e0b" fontSize="10" fontWeight="600" textAnchor="middle">50</text>
        <text x="180" y="120" fill="#ef4444" fontSize="10" fontWeight="600">100</text>
      </svg>

      {/* Score display */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
        <motion.span
          className="text-4xl font-bold"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-surface-500">/ 100</span>
      </div>
    </div>
  );
}

export function ResultsPage({ result, file, onReset }: ResultsPageProps) {
  const [imageView, setImageView] = useState<ImageView>('original');
  const [showOCR, setShowOCR] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);
  const [originalUrl] = useState(() => URL.createObjectURL(file));

  const riskColor = result.risk_level === 'likely_genuine' ? 'text-green-400'
                  : result.risk_level === 'suspicious' ? 'text-amber-400'
                  : 'text-red-400';
  const riskBg = result.risk_level === 'likely_genuine' ? 'bg-green-500/10 border-green-500/20'
               : result.risk_level === 'suspicious' ? 'bg-amber-500/10 border-amber-500/20'
               : 'bg-red-500/10 border-red-500/20';
  const RiskIcon = result.risk_level === 'likely_genuine' ? CheckCircle 
                 : result.risk_level === 'suspicious' ? AlertTriangle 
                 : AlertCircle;

  // Radar chart data
  const radarData = [
    { subject: 'ELA', value: Math.round(result.forensic_signals.ela_score * 100) },
    { subject: 'Noise', value: Math.round(result.forensic_signals.noise_score * 100) },
    { subject: 'Text', value: Math.round(result.forensic_signals.text_score * 100) },
    { subject: 'Layout', value: Math.round(result.forensic_signals.layout_score * 100) },
    { subject: 'ML', value: result.ml_score != null ? Math.round(result.ml_score * 100) : 0 },
  ];

  const currentImageSrc = (() => {
    if (imageView === 'ela' && result.ela_image_b64) {
      return `data:image/jpeg;base64,${result.ela_image_b64}`;
    }
    if (imageView === 'gradcam' && result.gradcam_image_b64) {
      return `data:image/jpeg;base64,${result.gradcam_image_b64}`;
    }
    if (imageView === 'annotated' && result.annotated_image_b64) {
      return `data:image/jpeg;base64,${result.annotated_image_b64}`;
    }
    return originalUrl;
  })();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      key="results"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <p className="text-surface-500 text-sm mb-1">Analysis complete — {file.name}</p>
          <h1 className="text-2xl font-bold text-white">Forensic Results</h1>
        </div>
        <button
          id="analyze-again-btn"
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl
                     bg-surface-800 hover:bg-surface-700 border border-surface-700
                     text-surface-300 text-sm font-medium transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Analyze Again
        </button>
      </motion.div>

      {/* Main verdict card */}
      <motion.div 
        variants={itemVariants}
        className={`glass rounded-2xl p-6 border ${riskBg}`}
      >
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex flex-col items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
            >
              <RiskIcon className={`w-16 h-16 ${riskColor}`} />
            </motion.div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${riskColor}`}>
                {RISK_LABELS[result.risk_level]}
              </p>
              <p className="text-surface-400 text-sm mt-1">
                {SCREENSHOT_TYPE_LABELS[result.screenshot_type]}
              </p>
            </div>
          </div>

          <div className="flex-1">
            <RiskGauge score={result.risk_score} level={result.risk_level} />
          </div>

          <div className="flex flex-col gap-3 min-w-[160px]">
            {[
              { label: 'ELA', score: result.forensic_signals.ela_score, status: result.forensic_signals.ela_status },
              { label: 'Noise', score: result.forensic_signals.noise_score, status: result.forensic_signals.noise_status },
              { label: 'Text', score: result.forensic_signals.text_score, status: result.forensic_signals.text_status },
              { label: 'Layout', score: result.forensic_signals.layout_score, status: result.forensic_signals.layout_status },
            ].map((sig) => {
              const level = sig.status !== 'ok' ? { label: 'N/A', color: 'text-surface-500', bg: 'bg-surface-800' }
                           : getSignalLevel(sig.score);
              return (
                <div key={sig.label} className="flex items-center justify-between gap-3">
                  <span className="text-surface-400 text-sm w-14">{sig.label}</span>
                  <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: level.color.replace('text-', '#').replace('red-400', 'ef4444').replace('amber-400', 'f59e0b').replace('green-400', '22c55e').replace('surface-500', '94a3b8') }}
                      initial={{ width: 0 }}
                      animate={{ width: sig.status === 'ok' ? `${sig.score * 100}%` : '0%' }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${level.bg} ${level.color}`}>
                    {level.label}
                  </span>
                </div>
              );
            })}

            {/* ML score */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-surface-400 text-sm w-14">ML</span>
              {result.ml_available && result.ml_score != null ? (
                <>
                  <div className="flex-1 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-brand-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${result.ml_score * 100}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded
                    ${getSignalLevel(result.ml_score).bg} ${getSignalLevel(result.ml_score).color}`}>
                    {getSignalLevel(result.ml_score).label}
                  </span>
                </>
              ) : (
                <span className="text-surface-500 text-xs flex-1">Not available</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3-column grid: Image, Radar, Suspicious Regions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image Viewer */}
        <motion.div variants={itemVariants} className="lg:col-span-2 glass rounded-2xl overflow-hidden">
          {/* View selector */}
          <div className="flex items-center gap-1 p-3 border-b border-surface-800/60">
            {[
              { id: 'original' as ImageView, label: 'Original', icon: <ImageIcon className="w-3.5 h-3.5" /> },
              { id: 'ela' as ImageView, label: 'ELA', icon: <Activity className="w-3.5 h-3.5" />, disabled: !result.ela_image_b64 },
              { id: 'gradcam' as ImageView, label: 'Grad-CAM', icon: <Eye className="w-3.5 h-3.5" />, disabled: !result.gradcam_image_b64 },
              { id: 'annotated' as ImageView, label: 'Regions', icon: <Zap className="w-3.5 h-3.5" />, disabled: !result.annotated_image_b64 },
            ].map((view) => (
              <button
                key={view.id}
                id={`view-${view.id}`}
                onClick={() => !view.disabled && setImageView(view.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                           transition-all ${view.disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                           ${imageView === view.id 
                             ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' 
                             : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'}`}
              >
                {view.icon}
                {view.label}
              </button>
            ))}
          </div>

          <div className="p-4 bg-surface-950/50 min-h-64 flex items-center justify-center">
            <motion.img
              key={imageView}
              src={currentImageSrc}
              alt={`${imageView} view`}
              className="max-h-96 max-w-full object-contain rounded-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {imageView !== 'original' && (
            <div className="px-4 pb-3 text-xs text-surface-500 text-center">
              {imageView === 'ela' && 'ELA: Bright areas indicate different compression history'}
              {imageView === 'gradcam' && 'Grad-CAM: Model attention (not proof of manipulation)'}
              {imageView === 'annotated' && 'Annotated: Suspected high-risk regions highlighted'}
            </div>
          )}
        </motion.div>

        {/* Radar + Suspicious Regions */}
        <div className="space-y-6">
          {/* Radar chart */}
          <motion.div variants={itemVariants} className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-brand-400" />
              Signal Overview
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(148,163,184,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '12px',
                  }}
                  formatter={(val) => [`${val ?? 0}%`, 'Score']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Suspicious regions */}
          <motion.div variants={itemVariants} className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Suspicious Regions
            </h3>
            {result.suspicious_regions.length === 0 ? (
              <p className="text-surface-500 text-xs text-center py-4">
                No specific regions flagged
              </p>
            ) : (
              <div className="space-y-2">
                {result.suspicious_regions.map((r, i) => (
                  <div key={i} className="p-3 rounded-xl bg-surface-800/50 border border-surface-700/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-surface-200">{r.label}</span>
                      <span className="text-xs text-amber-400 font-mono">
                        {Math.round(r.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-surface-500 leading-relaxed">{r.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Explanation */}
      <motion.div variants={itemVariants} className="glass rounded-2xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-5 text-left"
          onClick={() => setShowExplanation(!showExplanation)}
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-brand-400" />
            <h3 className="font-semibold text-white">Forensic Evidence Summary</h3>
          </div>
          {showExplanation ? 
            <ChevronUp className="w-4 h-4 text-surface-400" /> : 
            <ChevronDown className="w-4 h-4 text-surface-400" />
          }
        </button>
        
        {showExplanation && (
          <div className="px-5 pb-5 space-y-2">
            {result.explanation.map((finding, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface-800/50">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
                <p className="text-surface-300 text-sm leading-relaxed">{finding}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* OCR Results */}
      {result.ocr_results.length > 0 && (
        <motion.div variants={itemVariants} className="glass rounded-2xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-5 text-left"
            onClick={() => setShowOCR(!showOCR)}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-brand-400" />
              <h3 className="font-semibold text-white">
                OCR Extracted Text 
                <span className="ml-2 text-sm font-normal text-surface-500">
                  ({result.ocr_results.length} items)
                </span>
              </h3>
            </div>
            {showOCR ? 
              <ChevronUp className="w-4 h-4 text-surface-400" /> : 
              <ChevronDown className="w-4 h-4 text-surface-400" />
            }
          </button>
          
          {showOCR && (
            <div className="px-5 pb-5">
              <div className="rounded-xl overflow-hidden border border-surface-800">
                <table className="w-full text-sm">
                  <thead className="bg-surface-800/80">
                    <tr>
                      <th className="text-left px-4 py-2 text-surface-400 font-medium">Text</th>
                      <th className="text-right px-4 py-2 text-surface-400 font-medium">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800">
                    {result.ocr_results.slice(0, 15).map((item, i) => (
                      <tr key={i} className="hover:bg-surface-800/30">
                        <td className="px-4 py-2.5 text-surface-200 font-mono">{item.text}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`text-xs font-semibold ${
                            item.confidence >= 0.8 ? 'text-green-400' :
                            item.confidence >= 0.5 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {Math.round(item.confidence * 100)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ML Model Status */}
      {!result.ml_available && (
        <motion.div
          variants={itemVariants}
          className="glass rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5"
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-300 mb-1">ML Model Not Trained</h4>
              <p className="text-surface-400 text-sm leading-relaxed">
                The forensic analysis modules are fully operational, but the trained 
                manipulation classifier is not yet available. Analysis relies on ELA, 
                noise, OCR, and layout signals. Train the model using{' '}
                <code className="text-brand-300 bg-surface-800 px-1 rounded">python ml/train.py</code>{' '}
                to enable ML-based detection.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <motion.div variants={itemVariants} className="glass rounded-2xl p-4 border border-surface-700">
          <h4 className="text-sm font-semibold text-surface-300 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Analysis Notes
          </h4>
          <ul className="space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i} className="text-xs text-surface-500">{w}</li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Disclaimer */}
      <motion.div
        variants={itemVariants}
        className="glass rounded-2xl p-5 border border-surface-700"
      >
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-surface-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-surface-300 mb-1">Important Disclaimer</h4>
            <p className="text-surface-500 text-sm leading-relaxed">
              TruthLens AI provides a <strong className="text-surface-400">forensic risk assessment</strong>,
              not definitive proof of authenticity or fraud. A high risk score does not prove manipulation;
              a low score does not guarantee authenticity. This tool should be used as one factor among 
              many when evaluating document authenticity.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
