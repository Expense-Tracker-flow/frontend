'use client';

import React from 'react';
import { 
  MessageSquare, 
  PieChart, 
  Zap, 
  History, 
  Settings as SettingsIcon, 
  Plus
} from 'lucide-react';
import { DashboardTab } from './Header';

interface MobileBottomNavProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  onOpenQuickAdd: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenQuickAdd,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#12141C]/95 backdrop-blur-xl border-t border-surface-border px-2 pt-1.5 pb-2 safe-area-pb shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around relative">
        {/* 1. Chat Tab (MonAI) */}
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === 'home'
              ? 'text-primary font-bold'
              : 'text-zinc-400 hover:text-foreground'
          }`}
        >
          <MessageSquare className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight tracking-tight">Chat</span>
        </button>

        {/* 2. Summary Tab */}
        <button
          onClick={() => onTabChange('summary')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === 'summary'
              ? 'text-primary font-bold'
              : 'text-zinc-400 hover:text-foreground'
          }`}
        >
          <PieChart className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight tracking-tight">Summary</span>
        </button>

        {/* Center Quick Add Floating Trigger */}
        <div className="flex items-center justify-center px-1">
          <button
            onClick={onOpenQuickAdd}
            className="w-10 h-10 -mt-3.5 rounded-full bg-primary hover:bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary/35 border-2 border-surface transition-transform active:scale-95"
            aria-label="Add Transaction"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* 3. Automate Tab */}
        <button
          onClick={() => onTabChange('automate')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === 'automate'
              ? 'text-primary font-bold'
              : 'text-zinc-400 hover:text-foreground'
          }`}
        >
          <Zap className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight tracking-tight">Automate</span>
        </button>

        {/* 4. History Tab */}
        <button
          onClick={() => onTabChange('history')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === 'history'
              ? 'text-primary font-bold'
              : 'text-zinc-400 hover:text-foreground'
          }`}
        >
          <History className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] leading-tight tracking-tight">History</span>
        </button>
      </div>
    </nav>
  );
};
