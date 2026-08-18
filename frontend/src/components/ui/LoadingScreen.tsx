import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import LightTunnel from './LightTunnel';
import { ShieldCheck } from 'lucide-react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  durationMs?: number;
  onComplete?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  durationMs = 2200,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Loading...');

  useEffect(() => {
    const texts = [
      'Authenticating session...',
      'Verifying digital credentials...',
      'Loading forensic models...',
      'Access granted. Entering workspace...',
    ];

    let textIdx = 0;
    const textInterval = setInterval(() => {
      textIdx = (textIdx + 1) % texts.length;
      setLoadingText(texts[textIdx]);
    }, Math.floor(durationMs / 3.5));

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / durationMs) * 100), 100);
      setProgress(pct);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        clearInterval(textInterval);
        if (onComplete) onComplete();
      }
    }, 30);

    return () => {
      clearInterval(interval);
      clearInterval(textInterval);
    };
  }, [durationMs, onComplete]);

  return (
    <div className="flex h-screen w-screen items-center justify-center relative overflow-hidden bg-[#090B0F] select-none">
      {/* Light Tunnel Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden="true">
        <LightTunnel
          cableColor="#00F2EA"
          pulseColor="#4F7CFF"
          tunnelColor="#00F2EA"
          tunnelOpacity={0}
          speed={0.12}
          flowDirection="outward"
          pulseSpeed={2.2}
          pulseLength={0.3}
          cableCount={24}
          thickness={0.32}
          rimWidth={0.2}
          waviness={0.4}
          sway={0.45}
          size={1.15}
          glow={1.0}
          fadeNear={0.4}
          fadeFar={2.2}
          brightness={0.8}
          colorVariance={true}
          grain={true}
          grainIntensity={0.04}
          opacity={0.65}
          mouseInteraction={false}
          mouseStrength={0}
        />
      </div>

      {/* Center Loading Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center max-w-sm w-full mx-4 p-8 rounded-xl border border-cyan-500/30 bg-[#0c1017]/85 backdrop-blur-xl shadow-[0_0_50px_rgba(0,242,234,0.15)]"
      >
        {/* Glow icon */}
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,234,0.3)]">
            <ShieldCheck className="w-8 h-8 text-cyan-400 animate-pulse" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-cyan-500/20 blur-md -z-10 animate-pulse" />
        </div>

        {/* Glitch Loading Effect */}
        <div className="loader my-3">
          <div data-glitch="Loading..." className="glitch">
            Loading...
          </div>
        </div>

        {/* Substatus message */}
        <p className="text-xs font-mono text-cyan-300/80 mb-6 h-4 text-center">
          {loadingText}
        </p>

        {/* Cyber Progress Bar */}
        <div className="w-full bg-slate-900/90 rounded-full h-2 p-0.5 border border-cyan-500/20 mb-3 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 shadow-[0_0_10px_rgba(0,242,234,0.8)]"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'linear' }}
          />
        </div>

        {/* Percentage Counter */}
        <div className="w-full flex justify-between text-[11px] font-mono text-slate-400">
          <span className="text-cyan-400/80 tracking-wider">SYSTEM_INIT</span>
          <span className="text-cyan-300 font-semibold">{progress}%</span>
        </div>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;
