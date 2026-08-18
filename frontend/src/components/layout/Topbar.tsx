import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Page = 'home' | 'history' | 'auth';

const PAGE_TITLES: Record<Page, string> = {
  home:    'Analyze Screenshot',
  history: 'Analysis History',
  auth:    'Account',
};

interface TopbarProps {
  currentPage: Page;
  analysisStatus?: string;
  engineOnline: boolean;
  onPageChange: (p: Page) => void;
}

export function Topbar({ currentPage, analysisStatus, engineOnline, onPageChange }: TopbarProps) {
  const { user, signOut } = useAuth();

  const userLabel =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Account';

  return (
    <header
      className="app-topbar flex items-center justify-between px-5 lg:pl-6 sticky top-0 z-20"
      style={{ paddingLeft: window.innerWidth >= 1024 ? '24px' : '52px' }}
    >
      {/* Left — page title + status */}
      <div className="flex items-center gap-3">
        <h1 className="text-[14px] font-semibold text-[var(--text-primary)]">
          {PAGE_TITLES[currentPage]}
        </h1>
        {analysisStatus && (
          <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
            — {analysisStatus}
          </span>
        )}
      </div>

      {/* Right — engine pill + user */}
      <div className="flex items-center gap-3">
        {/* Engine status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--surface)]">
          <div className={`status-dot ${engineOnline ? 'online animate-pulse-soft' : 'offline'}`} />
          <span className="text-[11px] text-[var(--text-muted)]">
            {engineOnline ? 'Engine Online' : 'Engine Offline'}
          </span>
        </div>

        {/* Auth */}
        {user ? (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border)] bg-[var(--surface)]">
              <div className="w-5 h-5 rounded bg-[var(--accent)] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                {userLabel.charAt(0).toUpperCase()}
              </div>
              <span className="text-[12px] text-[var(--text-secondary)] max-w-[100px] truncate hidden sm:block">
                {userLabel}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="btn btn-ghost px-2 py-1 h-7"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onPageChange('auth')}
            className={`btn btn-secondary h-7 text-xs ${currentPage === 'auth' ? 'border-[var(--accent)] text-[var(--accent)]' : ''}`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
