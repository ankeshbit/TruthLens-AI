import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { UploadPage } from './pages/UploadPage';
import { AnalyzingPage } from './pages/AnalyzingPage';
import { ResultsPage } from './pages/ResultsPage';
import { HistoryPage } from './pages/HistoryPage';
import { Navbar } from './components/Navbar';
import type { AnalysisState } from './types';
import { analyzeScreenshot } from './services/api';

type Page = 'home' | 'history';

function App() {
  const [page, setPage] = useState<Page>('home');
  const [state, setState] = useState<AnalysisState>({ status: 'idle' });

  const handleFileUpload = useCallback(async (file: File) => {
    setState({ status: 'uploading' });

    try {
      setState({ status: 'analyzing', step: 'Validating image...' });
      
      // Small delay to show animation
      await new Promise(r => setTimeout(r, 300));
      setState({ status: 'analyzing', step: 'Running OCR analysis...' });
      
      const result = await analyzeScreenshot(file);
      
      setState({ status: 'complete', result, file });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Analysis failed. Please try again.';
      setState({ status: 'error', message });
    }
  }, []);

  const handleReset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  const renderContent = () => {
    if (page === 'history') {
      return <HistoryPage />;
    }

    switch (state.status) {
      case 'idle':
      case 'error':
        return (
          <UploadPage 
            onFileUpload={handleFileUpload}
            error={state.status === 'error' ? state.message : undefined}
          />
        );
      case 'uploading':
      case 'analyzing':
        return (
          <AnalyzingPage 
            step={state.status === 'analyzing' ? state.step : 'Uploading...'}
          />
        );
      case 'complete':
        return (
          <ResultsPage
            result={state.result}
            file={state.file}
            onReset={handleReset}
          />
        );
    }
  };

  return (
    <div className="min-h-screen forensic-grid">
      <Navbar 
        currentPage={page}
        onPageChange={setPage}
        onReset={handleReset}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
