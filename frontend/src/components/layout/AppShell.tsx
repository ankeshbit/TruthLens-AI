import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { getHealth } from '../../services/api';

type Page = 'home' | 'history' | 'auth' | 'settings' | 'about';

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
    <div className="flex h-screen overflow-hidden bg-app">
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
          onPageChange={onPageChange}
        />

        <main
          className="flex-1 overflow-y-auto"
          style={{ background: 'var(--bg)' }}
        >
          <div className="max-w-screen-xl mx-auto px-5 py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
