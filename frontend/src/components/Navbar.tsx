import { Shield, History, Eye, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavbarProps {
  currentPage: string;
  onPageChange: (page: 'home' | 'history') => void;
  onReset: () => void;
}

export function Navbar({ currentPage, onPageChange, onReset }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-surface-800/80 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.button
            className="flex items-center gap-3 group"
            onClick={() => { onPageChange('home'); onReset(); }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 
                              flex items-center justify-center shadow-lg shadow-brand-500/20
                              group-hover:shadow-brand-500/40 transition-shadow">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full 
                              border-2 border-surface-950 animate-pulse" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-base font-bold text-gradient-brand tracking-tight">
                TruthLens AI
              </span>
              <span className="text-xs text-surface-500 font-medium tracking-wider uppercase">
                Forensic Analysis
              </span>
            </div>
          </motion.button>

          {/* Nav links */}
          <nav className="flex items-center gap-2">
            <NavLink
              label="Analyze"
              icon={<Home className="w-4 h-4" />}
              active={currentPage === 'home'}
              onClick={() => { onPageChange('home'); onReset(); }}
            />
            <NavLink
              label="History"
              icon={<History className="w-4 h-4" />}
              active={currentPage === 'history'}
              onClick={() => onPageChange('history')}
            />
          </nav>

          {/* Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg 
                          bg-brand-500/10 border border-brand-500/20">
            <Shield className="w-4 h-4 text-brand-400" />
            <span className="text-xs text-brand-300 font-medium">Digital Forensics</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ 
  label, 
  icon, 
  active, 
  onClick 
}: { 
  label: string; 
  icon: React.ReactNode; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200 ${
        active
          ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
          : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
    >
      {icon}
      {label}
    </motion.button>
  );
}
