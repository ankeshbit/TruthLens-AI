import { useState, useEffect } from 'react';
import {
  ScanSearch, History, Settings, Info,
  ChevronRight, Menu, X
} from 'lucide-react';

type Page = 'home' | 'history' | 'auth';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (p: Page) => void;
  onReset: () => void;
  engineOnline: boolean;
}

export function Sidebar({ currentPage, onPageChange, onReset, engineOnline }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // close on route change
  useEffect(() => setMobileOpen(false), [currentPage]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-3 left-3 z-50 lg:hidden btn btn-ghost p-1.5"
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          app-sidebar fixed lg:static inset-y-0 left-0 z-40
          flex flex-col h-screen overflow-y-auto
          transition-transform duration-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[var(--border)]">
          <div className="w-7 h-7 rounded-md overflow-hidden flex-shrink-0">
            <img src="/logo.png" alt="VeriShot" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-none">VeriShot AI</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Digital Forensics</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <div className="nav-section-label">Workspace</div>

          <NavItem
            icon={<ScanSearch className="w-4 h-4" />}
            label="Analyze"
            active={currentPage === 'home'}
            onClick={() => { onPageChange('home'); onReset(); }}
          />
          <NavItem
            icon={<History className="w-4 h-4" />}
            label="History"
            active={currentPage === 'history'}
            onClick={() => onPageChange('history')}
          />

          <div className="nav-section-label mt-3">System</div>

          <NavItem
            icon={<Settings className="w-4 h-4" />}
            label="Settings"
            active={false}
            onClick={() => {}}
            disabled
          />
          <NavItem
            icon={<Info className="w-4 h-4" />}
            label="About"
            active={false}
            onClick={() => {}}
            disabled
          />
        </nav>

        {/* System Status */}
        <div className="px-3 py-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 px-2 py-2 rounded-md">
            <div className={`status-dot ${engineOnline ? 'online' : 'offline'}`} />
            <div>
              <p className="text-[11px] font-medium text-[var(--text-secondary)] leading-none">
                Analysis Engine
              </p>
              <p className={`text-[10px] mt-0.5 ${engineOnline ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                {engineOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavItem({
  icon, label, active, onClick, disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`nav-item w-full ${active ? 'active' : ''} ${disabled ? 'opacity-35 cursor-not-allowed' : ''}`}
      onClick={disabled ? undefined : onClick}
      aria-current={active ? 'page' : undefined}
      disabled={disabled}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {active && <ChevronRight className="w-3 h-3 opacity-40" />}
    </button>
  );
}
