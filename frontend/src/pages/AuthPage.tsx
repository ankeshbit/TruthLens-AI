import React, { useState } from 'react';
import {
  Shield, Lock, Mail, User as UserIcon, Eye, EyeOff,
  ArrowRight, KeyRound, AlertCircle, CheckCircle2, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthPageProps {
  onSuccess?: () => void;
  onBackToHome?: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot_password';

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess, onBackToHome }) => {
  const { signInWithEmail, signUpWithEmail, resetPassword, signInWithOAuth, isConfigured } = useAuth();

  const [mode, setMode]                   = useState<AuthMode>('signin');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName]           = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [loading, setLoading]             = useState(false);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);
  const [successMsg, setSuccessMsg]       = useState<string | null>(null);

  const clearMessages = () => { setErrorMsg(null); setSuccessMsg(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim()) { setErrorMsg('Please enter a valid email address.'); return; }

    if (mode === 'forgot_password') {
      setLoading(true);
      const res = await resetPassword(email.trim());
      setLoading(false);
      res.error ? setErrorMsg(res.error) : setSuccessMsg(res.message || 'Reset link sent to your email.');
      return;
    }

    if (!password) { setErrorMsg('Please enter your password.'); return; }

    if (mode === 'signup') {
      if (password.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }
      if (password !== confirmPassword) { setErrorMsg('Passwords do not match.'); return; }
      setLoading(true);
      const res = await signUpWithEmail(email.trim(), password, fullName.trim());
      setLoading(false);
      if (res.error) { setErrorMsg(res.error); return; }
      setSuccessMsg(res.message || 'Account created!');
      if (onSuccess) setTimeout(onSuccess, 1000);
      return;
    }

    setLoading(true);
    const res = await signInWithEmail(email.trim(), password);
    setLoading(false);
    if (res.error) { setErrorMsg(res.error); return; }
    setSuccessMsg('Signed in.');
    if (onSuccess) setTimeout(onSuccess, 500);
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    clearMessages();
    setLoading(true);
    const res = await signInWithOAuth(provider);
    setLoading(false);
    if (res.error) setErrorMsg(res.error);
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Back */}
      {onBackToHome && (
        <button
          onClick={onBackToHome}
          className="btn btn-ghost text-[12px] pl-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      )}

      <div className="panel p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pb-1">
          <div className="w-8 h-8 rounded bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
            <Shield className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] leading-none">
              {mode === 'signin'          && 'Sign In'}
              {mode === 'signup'          && 'Create Account'}
              {mode === 'forgot_password' && 'Reset Password'}
            </h2>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
              VeriShot AI · Digital Forensics Platform
            </p>
          </div>
        </div>

        {/* Config warning */}
        {!isConfigured && (
          <div className="flex items-start gap-2 p-3 rounded bg-[var(--warning)]/8 border border-[var(--warning)]/20">
            <AlertCircle className="w-3.5 h-3.5 text-[var(--warning)] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-[var(--warning)]">
              Supabase not configured. Add{' '}
              <code className="bg-black/30 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
              <code className="bg-black/30 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in{' '}
              <code className="bg-black/30 px-1 rounded">frontend/.env</code>.
            </p>
          </div>
        )}

        {/* Mode tabs */}
        {mode !== 'forgot_password' && (
          <div className="tab-bar w-full">
            <button
              className={`tab-btn flex-1 justify-center ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => { setMode('signin'); clearMessages(); }}
            >
              Sign In
            </button>
            <button
              className={`tab-btn flex-1 justify-center ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => { setMode('signup'); clearMessages(); }}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Messages */}
        {errorMsg && (
          <div className="flex items-start gap-2 p-3 rounded bg-[var(--danger)]/8 border border-[var(--danger)]/20" role="alert">
            <AlertCircle className="w-3.5 h-3.5 text-[var(--danger)] mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-[var(--danger)]">{errorMsg}</p>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start gap-2 p-3 rounded bg-[var(--success)]/8 border border-[var(--success)]/20" role="status">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)] mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-[var(--success)]">{successMsg}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="input pl-9"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="analyst@forensics.org"
                required
                className="input pl-9"
              />
            </div>
          </div>

          {mode !== 'forgot_password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-[var(--text-muted)]">Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot_password'); clearMessages(); }}
                    className="text-[11px] text-[var(--accent)] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input pl-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">Confirm Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input pl-9"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full justify-center h-9 mt-1"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'signin'          && 'Sign In'}
                {mode === 'signup'          && 'Create Account'}
                {mode === 'forgot_password' && 'Send Reset Link'}
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {mode === 'forgot_password' && (
          <button
            type="button"
            onClick={() => { setMode('signin'); clearMessages(); }}
            className="btn btn-ghost text-[12px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </button>
        )}

        {/* OAuth */}
        {mode !== 'forgot_password' && (
          <div>
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 border-t border-[var(--border)]" />
              <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Or</span>
              <div className="flex-1 border-t border-[var(--border)]" />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                disabled={loading}
                className="btn btn-secondary justify-center text-[12px]"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                  <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 15.9C3.5 19.7 7.4 23 12 23z"/>
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => handleOAuth('github')}
                disabled={loading}
                className="btn btn-secondary justify-center text-[12px]"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                GitHub
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
