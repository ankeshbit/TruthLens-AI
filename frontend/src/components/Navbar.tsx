import { Shield, History, Home, LogIn, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentPage: string;
  onPageChange: (page: 'home' | 'history' | 'auth') => void;
  onReset: () => void;
}

export function Navbar({ currentPage, onPageChange, onReset }: NavbarProps) {
  const { user, signOut } = useAuth();

  const userDisplayName = 
    user?.user_metadata?.full_name || 
    user?.email?.split('@')[0] || 
    'User';

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
              <img
                src="/logo.png"
                alt="VeriShot AI Logo"
                className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow"
              />
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full 
                              border-2 border-surface-950 animate-pulse" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-base font-bold text-gradient-brand tracking-tight">
                VeriShot AI
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

          {/* Right section: Badge & User / Auth */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg 
                            bg-brand-500/10 border border-brand-500/20">
              <Shield className="w-4 h-4 text-brand-400" />
              <span className="text-xs text-brand-300 font-medium">Digital Forensics</span>
            </div>

            {user ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-surface-800">
                <div className="flex items-center gap-2 bg-surface-900/90 border border-surface-700/80 px-3 py-1.5 rounded-xl">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-surface-200 max-w-[120px] truncate leading-tight">
                      {userDisplayName}
                    </span>
                    <span className="text-[10px] text-surface-500 max-w-[120px] truncate leading-none">
                      {user.email}
                    </span>
                  </div>
                </div>

                <motion.button
                  onClick={() => signOut()}
                  title="Sign Out"
                  className="p-2 rounded-xl text-surface-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <LogOut className="w-4 h-4" />
                </motion.button>
              </div>
            ) : (
              <motion.button
                onClick={() => onPageChange('auth')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  currentPage === 'auth'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'bg-surface-900/90 hover:bg-surface-800 text-surface-200 border border-surface-700/80 hover:border-brand-500/50'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <LogIn className="w-3.5 h-3.5 text-brand-400" />
                <span>Sign In</span>
              </motion.button>
            )}
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
