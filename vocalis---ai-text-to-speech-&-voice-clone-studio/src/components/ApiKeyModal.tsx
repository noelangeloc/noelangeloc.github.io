import React, { useState } from 'react';
import { KeyRound, Sparkles, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave }) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    if (!cleanKey) {
      setError('Please paste a valid Gemini API key.');
      return;
    }
    localStorage.setItem('vocalis_gemini_api_key', cleanKey);
    onSave(cleanKey);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl shadow-indigo-950/50 p-6 sm:p-7 text-neutral-100 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-20 bg-indigo-500/15 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Enter Gemini API Key</h3>
            <p className="text-[11px] text-neutral-400">Required to run voice synthesis & cloning</p>
          </div>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed mb-4">
          Paste your Google AI Studio API key below. It will be stored locally in your browser for this app.
        </p>

        {error && (
          <div className="mb-3 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="AIzaSy..."
            value={apiKeyInput}
            onChange={(e) => {
              setApiKeyInput(e.target.value);
              if (error) setError('');
            }}
            className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
            autoFocus
            required
          />

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Save & Start Studio</span>
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-neutral-800/80 text-center">
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 transition-colors"
          >
            <span>Get a free Gemini API key</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};