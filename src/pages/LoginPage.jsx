import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import ErrorMessage from '../components/ErrorMessage';
import FamilyLogo from '../components/FamilyLogo';
import { Lock, Mail, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);

  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Email + password submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (!email.trim() || !password) {
      setError('Please provide both your email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const data = await signUp(email.trim(), password);
        if (data?.session) {
          navigate('/');
        } else {
          setSuccessNotice(
            'Account created! If email confirmation is enabled, please check your inbox before signing in.'
          );
          setIsSignUp(false);
        }
      } else {
        await signIn(email.trim(), password);
        navigate('/');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Sign-in handler
  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessNotice(null);
    setGoogleLoading(true);

    try {
      if (signInWithGoogle) {
        await signInWithGoogle();
      } else {
        const { error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (oauthErr) throw oauthErr;
      }
      // Note: User will be redirected to Google auth page
    } catch (err) {
      console.error('Google Sign-In error:', err);
      setError(err);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        
        {/* App Logo & Tagline Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-3xl shadow-lg mb-4 text-white">
            <FamilyLogo className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            CircleCare
          </h1>
          <p className="mt-2 text-base sm:text-lg font-medium text-slate-600 max-w-md mx-auto leading-relaxed">
            Their health, their choices, your whole family beside them.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-xl border-2 border-slate-200">
          
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-6 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError(null);
                setSuccessNotice(null);
              }}
              className={`py-3 sm:py-3.5 text-base sm:text-lg font-bold rounded-xl transition-all ${
                !isSignUp
                  ? 'bg-white text-blue-900 shadow-md border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError(null);
                setSuccessNotice(null);
              }}
              className={`py-3 sm:py-3.5 text-base sm:text-lg font-bold rounded-xl transition-all ${
                isSignUp
                  ? 'bg-white text-blue-900 shadow-md border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          <ErrorMessage error={error} onDismiss={() => setError(null)} />

          {/* Success Notice */}
          {successNotice && (
            <div
              role="status"
              className="my-4 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 flex items-start gap-3"
            >
              <CheckCircle2 className="w-7 h-7 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-base sm:text-lg font-medium">{successNotice}</p>
            </div>
          )}

          {/* Continue with Google Button */}
          <div className="mt-2 mb-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl font-bold text-slate-800 bg-white hover:bg-slate-50 active:bg-slate-100 border-2 border-slate-300 hover:border-slate-400 shadow-sm transition text-base sm:text-lg min-h-[56px] disabled:opacity-60"
              aria-label="Continue with Google"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            {/* "or" Divider */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="border-t border-slate-300 w-full" />
              <span className="bg-white px-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 absolute">
                or
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email Field with Perfect Left-Padding */}
            <div>
              <label
                htmlFor="email-address"
                className="block text-base sm:text-lg font-bold text-slate-900 mb-2"
              >
                Enter your email
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-6 w-6 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full pl-14 pr-4 py-4 text-base sm:text-lg font-medium rounded-2xl border-2 border-slate-300 placeholder-slate-400 text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            {/* Password Field with Perfect Left & Right-Padding */}
            <div>
              <label
                htmlFor="password"
                className="block text-base sm:text-lg font-bold text-slate-900 mb-2"
              >
                Enter your password
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-6 w-6 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'Minimum 6 characters' : 'Enter your password'}
                  className="block w-full pl-14 pr-14 py-4 text-base sm:text-lg font-medium rounded-2xl border-2 border-slate-300 placeholder-slate-400 text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-800 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-6 w-6 text-slate-500" aria-hidden="true" />
                  ) : (
                    <Eye className="h-6 w-6 text-slate-500" aria-hidden="true" />
                  )}
                </button>
              </div>
              {isSignUp && (
                <p className="mt-2 text-sm text-slate-500 font-medium">
                  Must be at least 6 characters.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full flex justify-center items-center py-4 px-6 rounded-2xl text-lg sm:text-xl font-black text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 shadow-lg shadow-blue-200 transition-all min-h-[58px]"
              >
                {loading
                  ? isSignUp
                    ? 'Creating Account...'
                    : 'Signing In...'
                  : isSignUp
                  ? 'Create Free Account'
                  : 'Sign In with Email'}
              </button>
            </div>
          </form>

          {/* Footer message */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm sm:text-base text-slate-600 font-medium">
              CircleCare connects Elders, Caretakers, and Family together in one safe, supportive place.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
