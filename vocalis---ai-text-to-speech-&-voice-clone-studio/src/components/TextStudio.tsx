import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  Play,
  RotateCcw,
  Zap,
  Volume2,
  Clock,
  Type as TypeIcon,
  Smile,
  Activity,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface TextStudioProps {
  text: string;
  onTextChange: (newText: string) => void;
  selectedModel: 'gemini-3.8-flash-tts' | 'gemini-3.8-flash-lite-tts';
  onModelChange: (model: 'gemini-3.8-flash-tts' | 'gemini-3.8-flash-lite-tts') => void;
  stylePrompt: string;
  onStylePromptChange: (style: string) => void;
  selectedEmotion: string;
  onEmotionChange: (emotion: string) => void;
  selectedPace: string;
  onPaceChange: (pace: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  activeVoiceName: string;
  isClonedVoice: boolean;
}

export const TextStudio: React.FC<TextStudioProps> = ({
  text,
  onTextChange,
  selectedModel,
  onModelChange,
  stylePrompt,
  onStylePromptChange,
  selectedEmotion,
  onEmotionChange,
  selectedPace,
  onPaceChange,
  onGenerate,
  isGenerating,
  activeVoiceName,
  isClonedVoice,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Compute character & word counts
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  // Estimated duration at ~145 wpm = ~2.4 words per second
  const estimatedSec = Math.max(1, Math.round(wordCount / 2.4));

  // Quick preset texts
  const samplePrompts = [
    {
      title: 'News Broadcast',
      text: 'Good evening. Markets closed higher today as technology leaders reported record earnings, outpacing expectations across global indices.',
    },
    {
      title: 'Epic Trailer',
      text: 'In a forgotten age, <breath> beyond the outer rim of civilization, an impossible power awakened.',
    },
    {
      title: 'Tech Keynote',
      text: 'Today, we are thrilled to unveil our next-generation neural architecture. It is faster, more efficient, and radically intuitive.',
    },
    {
      title: 'Storytelling',
      text: 'Once upon a starlit twilight, deep in the whispering forest, little Barnaby the owl gazed out over the shimmering silver river.',
    },
    {
      title: 'Mindfulness',
      text: 'Take a gentle breath in through your nose... <breath> hold for a quiet moment... and slowly exhale all tension.',
    },
  ];

  // Insert expressive vocal tags directly into cursor position
  const insertTag = (tag: string) => {
    onTextChange(text + (text.endsWith(' ') ? '' : ' ') + tag + ' ');
  };

  const emotions = [
    'Natural / Neutral',
    'Warm & Friendly',
    'Enthusiastic',
    'Calm & Serene',
    'Whispering',
    'Authoritative',
    'Dramatic',
    'Playful',
  ];

  const paces = [
    { label: 'Slow', value: 'slow' },
    { label: 'Normal', value: 'normal' },
    { label: 'Fast', value: 'fast' },
  ];

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-xl backdrop-blur-sm space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <TypeIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              Script Editor
              <span className="text-[11px] font-normal text-neutral-400">
                Speaking with: <strong className="text-indigo-300 font-semibold">{activeVoiceName}</strong>
                {isClonedVoice && <span className="ml-1 text-[10px] text-violet-400 font-medium">(Cloned)</span>}
              </span>
            </h3>
          </div>
        </div>

        {/* Model Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
          <button
            onClick={() => onModelChange('gemini-3.8-flash-tts')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              selectedModel === 'gemini-3.8-flash-tts'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Flagship model: Supports Voice Design, vocal bursts (<breath>, <laugh>), and nuanced prosody"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Flash TTS (Flagship)</span>
          </button>
          <button
            onClick={() => onModelChange('gemini-3.8-flash-lite-tts')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              selectedModel === 'gemini-3.8-flash-lite-tts'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="High-speed, low-latency audio model for fast synthesis"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Lite TTS (Fast)</span>
          </button>
        </div>
      </div>

      {/* Main Text Area */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Type or paste your text here to synthesize speech..."
          rows={5}
          className="w-full p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 focus:border-indigo-500/80 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 resize-y leading-relaxed transition-all"
        />

        {/* Floating Quick Sample Prompt Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold whitespace-nowrap mr-1">
            Samples:
          </span>
          {samplePrompts.map((s) => (
            <button
              key={s.title}
              onClick={() => onTextChange(s.text)}
              className="px-2 py-0.5 rounded-md text-[11px] bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 whitespace-nowrap transition-colors"
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Expressive Tags & Punctuation Inserters */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-800/60">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
            Vocal Bursts:
          </span>
          <button
            onClick={() => insertTag('<breath>')}
            className="px-2 py-0.5 rounded-md bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-500/20 text-[11px] font-mono transition-colors"
            title="Adds a subtle, natural human breath pause"
          >
            &lt;breath&gt;
          </button>
          <button
            onClick={() => insertTag('<laugh>')}
            className="px-2 py-0.5 rounded-md bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-500/20 text-[11px] font-mono transition-colors"
            title="Adds a natural chuckle / laugh"
          >
            &lt;laugh&gt;
          </button>
          <button
            onClick={() => insertTag('<gasp>')}
            className="px-2 py-0.5 rounded-md bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-500/20 text-[11px] font-mono transition-colors"
            title="Adds a dramatic intake of air"
          >
            &lt;gasp&gt;
          </button>
          <button
            onClick={() => insertTag('|yeah|')}
            className="px-2 py-0.5 rounded-md bg-violet-950/40 hover:bg-violet-900/50 text-violet-300 border border-violet-500/20 text-[11px] font-mono transition-colors"
            title="Podcast conversational backchannel affirmative"
          >
            |yeah|
          </button>
          <button
            onClick={() => insertTag('|mhm|')}
            className="px-2 py-0.5 rounded-md bg-violet-950/40 hover:bg-violet-900/50 text-violet-300 border border-violet-500/20 text-[11px] font-mono transition-colors"
            title="Podcast conversational backchannel agreement"
          >
            |mhm|
          </button>
        </div>

        {/* Text statistics */}
        <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
          <span>{charCount} chars</span>
          <span>•</span>
          <span>{wordCount} words</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-indigo-300">
            <Clock className="w-3 h-3" /> ~{estimatedSec}s
          </span>
        </div>
      </div>

      {/* Style & Emotion Controls Toggle */}
      <div className="pt-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 transition-colors"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{showAdvanced ? 'Hide Voice Fine-Tuning' : 'Fine-Tune Emotion, Pacing & Style Guidance'}</span>
        </button>

        {showAdvanced && (
          <div className="mt-3 p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-3.5 animate-fade-in">
            {/* Emotion Chips */}
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1.5 flex items-center gap-1.5">
                <Smile className="w-3 h-3 text-indigo-400" />
                Vocal Emotion / Mood
              </label>
              <div className="flex flex-wrap gap-1.5">
                {emotions.map((emo) => {
                  const isSelected = selectedEmotion === emo;
                  return (
                    <button
                      key={emo}
                      onClick={() => onEmotionChange(emo)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                      }`}
                    >
                      {emo}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pacing Control */}
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1 flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-indigo-400" />
                  Speaking Pace
                </label>
                <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                  {paces.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => onPaceChange(p.value)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        selectedPace === p.value
                          ? 'bg-indigo-600 text-white'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Style Prompt Directive */}
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Custom Style Guidance (Prompt Modifier)
                </label>
                <input
                  type="text"
                  value={stylePrompt}
                  onChange={(e) => onStylePromptChange(e.target.value)}
                  placeholder="e.g. Inquisitive, slight gravelly texture, crisp pauses"
                  className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Action Bar */}
      <div className="pt-2 flex items-center justify-between">
        <button
          onClick={() => onTextChange('')}
          className="text-xs text-neutral-500 hover:text-neutral-300 flex items-center gap-1 transition-colors"
          title="Clear text input"
        >
          <RotateCcw className="w-3 h-3" />
          Clear
        </button>

        <button
          disabled={isGenerating || !text.trim()}
          onClick={onGenerate}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Synthesizing Voice...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Generate Speech</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
