import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { getHealth } from '../../services/api';
import LightTunnel from '../ui/LightTunnel';
import type { Page } from '../../types';

interface AppShellProps {
  currentPage: Page;
  onPageChange: (p: Page) => void;
  onReset: () => void;
  analysisStatus?: string;
  children: ReactNode;
}

export function AppShell({ currentPage, onPageChange, onReset, analysisStatus, children }: AppShellProps) {
  const [engineOnline, setEngineOnline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        await getHealth();
        if (!cancelled) setEngineOnline(true);
      } catch {
        if (!cancelled) setEngineOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    /* No solid background on root — the fixed WebGL canvas shows through */
    <div className="flex h-screen overflow-hidden" style={{ background: 'transparent' }}>
      {/* LightTunnel WebGL background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          /* Dark base so canvas renders against near-black, not pure white */
          background: '#090B0F',
        }}
        aria-hidden="true"
      >
        <LightTunnel
          cableColor="#4F7CFF"
          pulseColor="#85A8FF"
          tunnelColor="#4F7CFF"
          tunnelOpacity={0}
          speed={0.07}
          flowDirection="outward"
          pulseSpeed={1.6}
          pulseLength={0.26}
          pulseBlend={1}
          pulseWidth={1}
          cableCount={20}
          thickness={0.28}
          rimWidth={0.16}
          waviness={0.32}
          sway={0.38}
          size={1.1}
          glow={0.85}
          fadeNear={0.5}
          fadeFar={2}
          brightness={0.7}
          colorVariance={true}
          grain={true}
          grainIntensity={0.035}
          opacity={0.55}
          mouseInteraction={true}
          mouseStrength={0.07}
        />
      </div>

      {/* Sidebar + content — above the canvas */}
      <div
        className="flex h-screen overflow-hidden w-full"
        style={{ position: 'relative', zIndex: 1, background: 'transparent' }}
      >
        <Sidebar
          currentPage={currentPage}
          onPageChange={onPageChange}
          onReset={onReset}
          engineOnline={engineOnline}
        />

        {/* Main area */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Topbar
            currentPage={currentPage}
            analysisStatus={analysisStatus}
            engineOnline={engineOnline}
          />

          <main
            className="flex-1 overflow-y-auto"
            style={{ background: 'transparent' }}
          >
            <div className="max-w-screen-xl mx-auto px-5 py-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
