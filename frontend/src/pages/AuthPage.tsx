import React, { useState } from 'react';
import {
  Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

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

    if (!email.trim()) { setErrorMsg('Please enter a valid identity / email.'); return; }

    if (mode === 'forgot_password') {
      setLoading(true);
      const res = await resetPassword(email.trim());
      setLoading(false);
      res.error ? setErrorMsg(res.error) : setSuccessMsg(res.message || 'Key reset link sent to email.');
      return;
    }

    if (!password) { setErrorMsg('Access key required.'); return; }

    if (mode === 'signup') {
      if (password.length < 6) { setErrorMsg('Access key must be at least 6 characters.'); return; }
      if (password !== confirmPassword) { setErrorMsg('Access keys do not match.'); return; }
      setLoading(true);
      const res = await signUpWithEmail(email.trim(), password, fullName.trim());
      setLoading(false);
      if (res.error) { setErrorMsg(res.error); return; }
      setSuccessMsg(res.message || 'Agent identity created successfully.');
      if (onSuccess) setTimeout(onSuccess, 1000);
      return;
    }

    setLoading(true);
    const res = await signInWithEmail(email.trim(), password);
    setLoading(false);
    if (res.error) { setErrorMsg(res.error); return; }
    setSuccessMsg('Session authenticated. Access granted.');
    if (onSuccess) setTimeout(onSuccess, 500);
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    clearMessages();
    setLoading(true);
    const res = await signInWithOAuth(provider);
    setLoading(false);
    if (res.error) setErrorMsg(res.error);
  };

  const submitButtonText =
    mode === 'signin'          ? 'INITIATE_CONNECTION' :
    mode === 'signup'          ? 'REGISTER_IDENTITY' :
                                 'DISPATCH_RESET_KEY';

  return (
    <div className="glitch-form-wrapper">
      {onBackToHome && (
        <div className="w-full max-w-[440px] mb-3 flex items-center justify-start">
          <button
            onClick={onBackToHome}
            className="btn btn-ghost text-[11px] text-[var(--primary-color)] flex items-center gap-1.5 font-mono opacity-80 hover:opacity-100 p-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            &lt; RETURN_TO_SYSTEM
          </button>
        </div>
      )}

      <form className="glitch-card" onSubmit={handleSubmit}>
        {/* Card Header with futuristic SVG icon and status dots */}
        <div className="card-header">
          <div className="card-title">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
              <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
              <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path>
              <path d="M12 11.5a3 3 0 0 0 -3 2.824v1.176a3 3 0 0 0 6 0v-1.176a3 3 0 0 0 -3 -2.824z"></path>
            </svg>
            <span>VERISHOT SECURE_DATA</span>
          </div>

          <div className="card-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <div className="card-body">
          {/* Supabase unconfigured alert */}
          {!isConfigured && (
            <div className="flex items-start gap-2 p-2.5 mb-4 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 font-mono">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
              <p>
                SUPABASE_OFFLINE: Set <code className="text-cyan-300">VITE_SUPABASE_URL</code> in <code className="text-cyan-300">.env</code>
              </p>
            </div>
          )}

          {/* Mode Switcher */}
          {mode !== 'forgot_password' && (
            <div className="glitch-tabs">
              <button
                type="button"
                className={`glitch-tab-btn ${mode === 'signin' ? 'active' : ''}`}
                onClick={() => { setMode('signin'); clearMessages(); }}
              >
                SIGN_IN
              </button>
              <button
                type="button"
                className={`glitch-tab-btn ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => { setMode('signup'); clearMessages(); }}
              >
                REGISTER
              </button>
            </div>
          )}

          {/* Error / Success Messages */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-2.5 mb-4 rounded bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 font-mono" role="alert">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
              <p>{errorMsg}</p>
            </div>
          )}
          {successMsg && (
            <div className="flex items-start gap-2 p-2.5 mb-4 rounded bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 font-mono" role="status">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <p>{successMsg}</p>
            </div>
          )}

          {/* Signup Extra: Full Name */}
          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="fullName" className="form-label" data-text="ANALYST_NAME">
                ANALYST_NAME
              </label>
              <div className="input-container">
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  placeholder="e.g. Agent Miller"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          {/* Username / Email */}
          <div className="form-group">
            <label htmlFor="username" className="form-label" data-text="IDENTITY_EMAIL">
              IDENTITY_EMAIL
            </label>
            <div className="input-container">
              <input
                type="email"
                id="username"
                name="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="analyst@forensics.org"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Access Key / Password */}
          {mode !== 'forgot_password' && (
            <div className="form-group">
              <label htmlFor="password" className="form-label" data-text="ACCESS_KEY">
                ACCESS_KEY
              </label>
              <div className="input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="glitch-pwd-toggle"
                  aria-label={showPassword ? 'Hide access key' : 'Show access key'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Signup Confirm Password */}
          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label" data-text="CONFIRM_KEY">
                CONFIRM_KEY
              </label>
              <div className="input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {/* Forgot Password Link */}
          {mode === 'signin' && (
            <div className="text-right -mt-2 mb-3">
              <button
                type="button"
                onClick={() => { setMode('forgot_password'); clearMessages(); }}
                className="text-[11px] font-mono text-[var(--primary-color)] opacity-70 hover:opacity-100 hover:underline"
              >
                [ FORGOT_KEY? ]
              </button>
            </div>
          )}

          {/* Submit Button with Glitch Hover Effect */}
          <button
            data-text={loading ? 'PROCESSING...' : submitButtonText}
            type="submit"
            disabled={loading}
            className="submit-btn"
          >
            <span className="btn-text">
              {loading ? 'PROCESSING...' : submitButtonText}
            </span>
          </button>

          {/* Forgot Password back button */}
          {mode === 'forgot_password' && (
            <button
              type="button"
              onClick={() => { setMode('signin'); clearMessages(); }}
              className="w-full text-center mt-3 text-[11px] font-mono text-[var(--primary-color)] opacity-70 hover:opacity-100"
            >
              &lt; RETURN_TO_SIGN_IN
            </button>
          )}

          {/* OAuth options */}
          {mode !== 'forgot_password' && (
            <div className="mt-5 pt-4 border-t border-[rgba(0,242,234,0.15)]">
              <div className="text-center text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-3">
                EXTERNAL_PROVIDER
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  disabled={loading}
                  className="glitch-oauth-btn"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                    <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.9z"/>
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 15.9C3.5 19.7 7.4 23 12 23z"/>
                  </svg>
                  GOOGLE
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth('github')}
                  disabled={loading}
                  className="glitch-oauth-btn"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  GITHUB
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default AuthPage;
