'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  RefreshCw, 
  LogOut, 
  LogIn, 
  MessageSquare, 
  PieChart, 
  Zap, 
  History, 
  Settings as SettingsIcon, 
  ChevronDown,
  Tags,
  Download,
  Smartphone
} from 'lucide-react';
import { UserProfile } from '../lib/types';

export type DashboardTab = 'home' | 'summary' | 'categories' | 'automate' | 'history' | 'profile' | 'settings';

interface HeaderProps {
  user: UserProfile | null;
  activeTab?: DashboardTab;
  onTabChange?: (tab: DashboardTab) => void;
  onRefresh: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab = 'home',
  onTabChange,
  onRefresh,
  onOpenAuth,
  onLogout,
  isLoading,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }).toUpperCase();

  // Check standalone mode and capture PWA beforeinstallprompt event
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      const handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }
  }, []);

  const handleInstallPwa = async () => {
    if (isStandalone) {
      alert("FIN-XL is already running as an installed app on your device!");
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert(
        "To install FIN-XL:\n\n• On iOS Safari: Tap the Share button (⎋) and select 'Add to Home Screen'.\n• On Chrome / Edge: Click the Install icon (⊕) in the browser address bar."
      );
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="w-full border-b border-surface-border bg-white/90 dark:bg-[#12141C]/90 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={() => onTabChange?.('home')}
          className="cursor-pointer select-none"
        >
          <span className="text-xl font-bold tracking-tight text-foreground hover:opacity-85 transition-opacity">
            FIN-XL
          </span>
        </div>

        {/* Center Navigation Tabs (When Authenticated - Desktop View) */}
        {user && onTabChange && (
          <nav className="hidden md:flex items-center bg-surface-raised p-1 rounded-2xl border border-surface-border">
            <button
              onClick={() => onTabChange('home')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'home'
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'text-zinc-500 hover:text-foreground'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => onTabChange('summary')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'summary'
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'text-zinc-500 hover:text-foreground'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Summary</span>
            </button>

            <button
              onClick={() => onTabChange('categories')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'categories'
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'text-zinc-500 hover:text-foreground'
              }`}
            >
              <Tags className="w-3.5 h-3.5" />
              <span>Categories</span>
            </button>

            <button
              onClick={() => onTabChange('automate')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'automate'
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'text-zinc-500 hover:text-foreground'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Automate</span>
            </button>

            <button
              onClick={() => onTabChange('history')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'text-zinc-500 hover:text-foreground'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
          </nav>
        )}

        {/* Right Section: Refresh & User Profile Dropdown */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            className="p-2 text-zinc-400 hover:text-foreground rounded-xl hover:bg-surface-raised transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>

          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono text-zinc-400 uppercase tracking-widest">{currentDate}</div>
          </div>

          <div className="flex items-center space-x-2 pl-2 border-l border-surface-border relative" ref={dropdownRef}>
            {user ? (
              <div className="relative">
                {/* Profile Pill Trigger */}
                <button
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className={`flex items-center space-x-2.5 bg-surface-raised border hover:border-primary/40 px-3 py-1.5 rounded-2xl transition-all shadow-sm group ${
                    activeTab === 'profile' || activeTab === 'settings'
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-surface-border'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-foreground hidden md:block max-w-[120px] truncate">
                    {user.fullName}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 group-hover:text-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-surface border border-surface-border rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-foreground">
                    {/* User Info Header */}
                    <div className="px-3 py-2.5 border-b border-surface-border mb-1">
                      <p className="text-xs font-semibold text-foreground truncate">{user.fullName}</p>
                      <p className="text-[11px] text-zinc-400 font-mono truncate">{user.email}</p>
                    </div>

                    {/* Menu Actions (Navigate to Full Screens) */}
                    <div className="space-y-0.5">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onTabChange?.('profile');
                        }}
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-colors text-left font-medium ${
                          activeTab === 'profile'
                            ? 'bg-primary/10 text-primary'
                            : 'text-zinc-600 dark:text-zinc-300 hover:text-foreground hover:bg-surface-raised'
                        }`}
                      >
                        <User className="w-4 h-4 text-primary" />
                        <span>My Profile Screen</span>
                      </button>

                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onTabChange?.('settings');
                        }}
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-colors text-left font-medium ${
                          activeTab === 'settings'
                            ? 'bg-primary/10 text-primary'
                            : 'text-zinc-600 dark:text-zinc-300 hover:text-foreground hover:bg-surface-raised'
                        }`}
                      >
                        <SettingsIcon className="w-4 h-4 text-indigo-500" />
                        <span>Settings & Preferences</span>
                      </button>

                      {/* Install App / PWA Option */}
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleInstallPwa();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-600 dark:text-zinc-300 hover:text-foreground hover:bg-surface-raised transition-colors text-left font-medium group"
                      >
                        <div className="flex items-center space-x-2.5">
                          <Download className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                          <span>Install PWA / App</span>
                        </div>
                        {isStandalone ? (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                            Installed
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                            Install
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Sign Out Action */}
                    <div className="pt-1 mt-1 border-t border-surface-border">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-rose-500 hover:bg-rose-500/10 transition-colors text-left font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-600 transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
