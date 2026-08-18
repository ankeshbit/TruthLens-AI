import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppShell } from './components/layout/AppShell';
import { UploadPage }    from './pages/UploadPage';
import { AnalyzingPage } from './pages/AnalyzingPage';
import { ResultsPage }   from './pages/ResultsPage';
import { HistoryPage }   from './pages/HistoryPage';
import { AuthPage }      from './pages/AuthPage';
import { SettingsPage }  from './pages/SettingsPage';
import { AboutPage }     from './pages/AboutPage';
import { AuthProvider }  from './context/AuthContext';
import type { AnalysisState } from './types';
import { analyzeScreenshot } from './services/api';

type Page = 'home' | 'history' | 'auth' | 'settings' | 'about';

function MainApp() {
  const [page, setPage] = useState<Page>('home');
  const [state, setState] = useState<AnalysisState>({ status: 'idle' });

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

  const renderContent = () => {
    if (page === 'auth') {
      return (
        <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AuthPage onSuccess={() => setPage('home')} onBackToHome={() => setPage('home')} />
        </motion.div>
      );
    }

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
