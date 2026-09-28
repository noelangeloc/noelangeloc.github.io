import React from 'react';
import { Sparkles, Mic, Wand2, Volume2, ShieldCheck, Radio } from 'lucide-react';

interface HeaderProps {
  onOpenCloneModal: () => void;
  serverOk: boolean;
  clonedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCloneModal,
  serverOk,
  clonedCount,
}) => {
  return (
    <header className="border-b border-neutral-800/80 bg-neutral-950/70 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Volume2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white">
                Vocalis
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Voice AI Studio
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 hidden sm:block">
              Expressive Text-to-Speech & Acoustic Voice Cloning
            </p>
          </div>
        </div>

        {/* Status & Action */}
        <div className="flex items-center gap-3">
          {/* Server Connection Status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400">
            <span
              className={`w-2 h-2 rounded-full ${
                serverOk ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{serverOk ? 'Gemini Audio Active' : 'Connecting...'}</span>
          </div>

          {/* Clone Voice CTA */}
          <button
            onClick={onOpenCloneModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Wand2 className="w-4 h-4 text-violet-200" />
            <span>Clone Voice</span>
            {clonedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-bold">
                {clonedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
