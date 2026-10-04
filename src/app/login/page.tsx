'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, User, ArrowRight, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { api } from '../../lib/api';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (otpTimer > 0) {
      const interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer]);

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address first.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      await api.sendOtp({
        email: email.trim(),
        purpose: 'REGISTRATION',
      });
      setOtpSent(true);
      setOtpTimer(60);
      setSuccessMsg(`Verification code sent to ${email.trim()}`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 404 ? 'API service unavailable. Please try again shortly.' : err?.message || 'Failed to send verification code. Please check your connection.');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // In signup mode, if OTP not sent, send OTP first
    if (!isLogin && !otpSent) {
      await handleSendOtp();
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const res = await api.login({
          email: email.trim(),
          password,
        });

        if (res.success && res.data) {
          localStorage.setItem('flow_access_token', res.data.accessToken);
          localStorage.setItem('flow_refresh_token', res.data.refreshToken);
          localStorage.setItem('flow_user', JSON.stringify(res.data.user));
          router.push('/');
        }
      } else {
        if (!otpCode.trim() || otpCode.trim().length !== 6) {
          setError('Please enter the 6-digit verification code sent to your email.');
          setIsLoading(false);
          return;
        }

        const res = await api.register({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          otpCode: otpCode.trim(),
        });

        if (res.success && res.data) {
          localStorage.setItem('flow_access_token', res.data.accessToken);
          localStorage.setItem('flow_refresh_token', res.data.refreshToken);
          localStorage.setItem('flow_user', JSON.stringify(res.data.user));
          router.push('/');
        }
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.status === 404
          ? 'API service unavailable. Please try again shortly.'
          : err?.message || (isLogin ? 'Invalid email or password' : 'Registration failed. Please check your code.'));
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#08090E] text-zinc-100 flex flex-col justify-between selection:bg-primary/30 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-[128px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <Link href="/" className="cursor-pointer select-none">
          <span className="text-xl font-bold tracking-tight text-foreground hover:opacity-85 transition-opacity">
            FIN-XL
          </span>
        </Link>

        <Link
          href="/"
          className="text-xs text-zinc-400 hover:text-white transition-colors font-mono"
        >
          ← Back to Home
        </Link>
      </header>

      {/* Main Centered Form Card */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-8 flex flex-col items-center justify-center relative z-10">
        <div className="w-full bg-[#12141C] border border-[#262A3B] rounded-3xl p-8 shadow-2xl relative">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight font-mono">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {isLogin
                ? 'Access your personal financial ledger'
                : otpSent
                ? 'Enter the 6-digit code sent to your email'
                : 'Create your private financial ledger'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-[#1A1D28] p-1 rounded-2xl mb-6 text-xs font-semibold border border-[#262A3B]">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError(null);
                setSuccessMsg(null);
                setOtpSent(false);
              }}
              className={`py-2 rounded-xl transition-all ${
                isLogin ? 'bg-primary text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-xl transition-all ${
                !isLogin ? 'bg-primary text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-300">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    required={!isLogin}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Vance"
                    className="w-full bg-[#1A1D28] border border-[#262A3B] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-medium text-zinc-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  required
                  disabled={!isLogin && otpSent}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="alex@flow.app"
                  className="w-full bg-[#1A1D28] border border-[#262A3B] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-primary transition-colors disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-zinc-300">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1A1D28] border border-[#262A3B] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* OTP Code Field when in Sign Up mode and OTP is sent */}
            {!isLogin && otpSent && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-primary-300">
                    6-Digit Email Verification Code
                  </label>
                  <button
                    type="button"
                    disabled={otpTimer > 0 || isLoading}
                    onClick={handleSendOtp}
                    className="text-[11px] text-zinc-400 hover:text-primary-300 disabled:opacity-50 transition-colors"
                  >
                    {otpTimer > 0 ? `Resend code in ${otpTimer}s` : 'Resend code'}
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-400" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-[#1A1D28] border border-primary/50 focus:border-primary rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest text-white placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-4 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 group"
            >
              <span>
                {isLoading
                  ? 'Processing...'
                  : isLogin
                  ? 'Sign In to FIN-XL'
                  : !otpSent
                  ? 'Send Verification Code'
                  : 'Verify & Create Account'}
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          {/* Toggle helper */}
          <div className="text-center mt-6 text-xs text-zinc-400">
            {isLogin ? (
              <span>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => {
                    setIsLogin(false);
                    setError(null);
                    setSuccessMsg(null);
                    setOtpSent(false);
                  }}
                  className="text-primary-300 font-semibold hover:underline"
                >
                  Sign up now
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setIsLogin(true);
                    setError(null);
                    setSuccessMsg(null);
                    setOtpSent(false);
                  }}
                  className="text-primary-300 font-semibold hover:underline"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto px-6 py-6 text-center text-xs text-zinc-500 font-mono relative z-10">
        FIN-XL — Personal Finance Tracker
      </footer>
    </div>
  );
}
