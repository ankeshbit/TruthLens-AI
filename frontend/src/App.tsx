import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppShell } from './components/layout/AppShell';
import { UploadPage }    from './pages/UploadPage';
import { AnalyzingPage } from './pages/AnalyzingPage';
import { ResultsPage }   from './pages/ResultsPage';
import { HistoryPage }   from './pages/HistoryPage';
import { AuthPage }      from './pages/AuthPage';
import { SettingsPage }  from './pages/SettingsPage';
import { AboutPage }     from './pages/AboutPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import LightTunnel       from './components/ui/LightTunnel';
import LoadingScreen     from './components/ui/LoadingScreen';
import type { AnalysisState } from './types';
import { analyzeScreenshot } from './services/api';

type Page = 'home' | 'history' | 'settings' | 'about';

function MainApp() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('home');
  const [state, setState] = useState<AnalysisState>({ status: 'idle' });
  const [postLoginLoading, setPostLoginLoading] = useState(false);
  const [hasEnteredSession, setHasEnteredSession] = useState(false);

  // Trigger post-login loading screen whenever a new login session is established
  useEffect(() => {
    if (user && !hasEnteredSession) {
      setPostLoginLoading(true);
    } else if (!user) {
      setHasEnteredSession(false);
      setPostLoginLoading(false);
    }
  }, [user, hasEnteredSession]);

  const handleFileUpload = useCallback(async (file: File) => {
    setState({ status: 'uploading' });
    try {
      setState({ status: 'analyzing', step: 'Validating image…' });
      await new Promise(r => setTimeout(r, 300));
      setState({ status: 'analyzing', step: 'Running forensic analysis…' });
      const result = await analyzeScreenshot(file);
      setState({ status: 'complete', result, file });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Analysis failed. Please try again.';
      setState({ status: 'error', message });
    }
  }, []);

  const handleReset = useCallback(() => {
    setState({ status: 'idle' });
    setPage('home');
  }, []);

  const analysisStatus =
    state.status === 'analyzing' ? state.step :
    state.status === 'uploading' ? 'Uploading…' :
    undefined;

  // Show initial auth session check loading
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center relative overflow-hidden bg-[#090B0F]">
        <LightTunnel
          cableColor="#4F7CFF"
          pulseColor="#85A8FF"
          tunnelColor="#4F7CFF"
          tunnelOpacity={0}
          speed={0.07}
          flowDirection="outward"
          pulseSpeed={1.6}
          pulseLength={0.26}
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
          mouseInteraction={false}
          mouseStrength={0}
        />
        <div className="relative z-10 flex flex-col items-center gap-3 font-mono">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <p className="text-xs tracking-widest text-cyan-300 uppercase">Authenticating System Access...</p>
        </div>
      </div>
    );
  }

  // Mandatory Login: If unauthenticated, display the login / registration page
  if (!user) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center p-4 relative overflow-y-auto bg-[#090B0F]">
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden="true">
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
        <div className="relative z-10 w-full max-w-md my-auto">
          <AuthPage />
        </div>
      </div>
    );
  }

  // Post-Login Loading Delay screen: "Loading..." with smooth cyber animation
  if (postLoginLoading) {
    return (
      <LoadingScreen
        durationMs={2200}
        onComplete={() => {
          setPostLoginLoading(false);
          setHasEnteredSession(true);
        }}
      />
    );
  }

  const renderContent = () => {
    if (page === 'settings') {
      return (
        <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <SettingsPage />
        </motion.div>
      );
    }

    if (page === 'about') {
      return (
        <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AboutPage />
        </motion.div>
      );
    }

    if (page === 'history') {
      return (
        <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <HistoryPage />
        </motion.div>
      );
    }

    switch (state.status) {
      case 'idle':
      case 'error':
        return (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <UploadPage
              onFileUpload={handleFileUpload}
              error={state.status === 'error' ? state.message : undefined}
            />
          </motion.div>
        );
      case 'uploading':
      case 'analyzing':
        return (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnalyzingPage step={state.status === 'analyzing' ? state.step : 'Uploading…'} />
          </motion.div>
        );
      case 'complete':
        return (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ResultsPage result={state.result} file={state.file} onReset={handleReset} />
          </motion.div>
        );
    }
  };

  return (
    <AppShell
      currentPage={page}
      onPageChange={setPage}
      onReset={handleReset}
      analysisStatus={analysisStatus}
    >
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
    </AppShell>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
