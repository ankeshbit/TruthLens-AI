import { motion } from 'framer-motion';
import { Eye, Activity, Zap, Shield, ScanLine } from 'lucide-react';

interface AnalyzingPageProps {
  step: string;
}

const ANALYSIS_STEPS = [
  { icon: <Shield className="w-4 h-4" />, label: 'Image validation' },
  { icon: <Eye className="w-4 h-4" />, label: 'OCR text extraction' },
  { icon: <Activity className="w-4 h-4" />, label: 'ELA forensic analysis' },
  { icon: <Zap className="w-4 h-4" />, label: 'Noise pattern analysis' },
  { icon: <ScanLine className="w-4 h-4" />, label: 'Metadata extraction' },
  { icon: <Eye className="w-4 h-4" />, label: 'ML manipulation detection' },
  { icon: <Activity className="w-4 h-4" />, label: 'Evidence fusion' },
];

export function AnalyzingPage({ step }: AnalyzingPageProps) {
  return (
    <motion.div
      key="analyzing"
      className="max-w-lg mx-auto text-center py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Animated scanner */}
      <div className="relative w-32 h-32 mx-auto mb-10">
        {/* Outer rings */}
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border border-brand-500/30"
            animate={{ scale: [1, 1 + i * 0.15], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
          />
        ))}

        {/* Main circle */}
        <div className="absolute inset-0 rounded-full bg-brand-500/10 border border-brand-500/40 
                        flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <Eye className="w-12 h-12 text-brand-400" />
          </motion.div>
        </div>

        {/* Scan line */}
        <motion.div
          className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-brand-400 to-transparent"
          animate={{ top: ['10%', '90%', '10%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">Analyzing Screenshot</h2>
      <p className="text-surface-400 mb-10 text-sm">
        {step || 'Running multi-signal forensic analysis...'}
      </p>

      {/* Steps */}
      <div className="space-y-3 text-left">
        {ANALYSIS_STEPS.map((s, i) => (
          <motion.div
            key={s.label}
            className="flex items-center gap-3 px-4 py-3 rounded-xl glass"
            initial={{ opacity: 0.3, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15, duration: 0.4 }}
          >
            <motion.div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              animate={{
                backgroundColor: ['rgba(99,102,241,0.1)', 'rgba(99,102,241,0.3)', 'rgba(34,197,94,0.1)'],
              }}
              transition={{ delay: i * 0.4 + 0.5, duration: 0.5 }}
            >
              <span className="text-brand-400">{s.icon}</span>
            </motion.div>
            <span className="text-surface-300 text-sm">{s.label}</span>
            <motion.div
              className="ml-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.4 + 0.8 }}
            >
              <motion.div
                className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="mt-8 text-surface-500 text-xs"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        This may take 10–30 seconds...
      </motion.p>
    </motion.div>
  );
}
