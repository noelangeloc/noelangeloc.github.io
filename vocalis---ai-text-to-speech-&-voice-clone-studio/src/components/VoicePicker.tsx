import React, { useState } from 'react';
import {
  Mic2,
  Wand2,
  Check,
  Play,
  Volume2,
  Sparkles,
  Trash2,
  ShieldCheck,
  User,
  Filter,
} from 'lucide-react';
import { VoicePreset, ClonedVoiceProfile } from '../types';

interface VoicePickerProps {
  presets: VoicePreset[];
  clonedVoices: ClonedVoiceProfile[];
  selectedVoiceId: string;
  onSelectVoice: (voiceId: string, isCloned: boolean, voiceData: VoicePreset | ClonedVoiceProfile) => void;
  onOpenCloneModal: () => void;
  onDeleteClonedVoice: (id: string) => void;
  onPreviewSampleQuote: (text: string, voiceName: string, stylePrompt: string) => void;
  previewLoadingId: string | null;
}

export const VoicePicker: React.FC<VoicePickerProps> = ({
  presets,
  clonedVoices,
  selectedVoiceId,
  onSelectVoice,
  onOpenCloneModal,
  onDeleteClonedVoice,
  onPreviewSampleQuote,
  previewLoadingId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Categories list
  const categories = [
    'All',
    'My Cloned Voices',
    'Broadcast & News',
    'Narrative & Drama',
    'Conversational',
    'Wellness',
    'Entertainment',
  ];

  // Filter items
  const filteredPresets = presets.filter((p) => {
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'My Cloned Voices') return false;
    return p.category === selectedCategory;
  });

  const showCloned = selectedCategory === 'All' || selectedCategory === 'My Cloned Voices';

  return (
    <div className="space-y-4">
      {/* Category Pills & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const count =
              cat === 'All'
                ? presets.length + clonedVoices.length
                : cat === 'My Cloned Voices'
                ? clonedVoices.length
                : presets.filter((p) => p.category === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                {cat === 'My Cloned Voices' && <Wand2 className="w-3 h-3 text-violet-300" />}
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat ? 'bg-indigo-700/80 text-white' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onOpenCloneModal}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 shrink-0 transition-all hover:scale-[1.02]"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>+ Clone Voice</span>
        </button>
      </div>

      {/* Voice Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Clone Voice Shortcut Card */}
        <div
          onClick={onOpenCloneModal}
          className="p-4 rounded-2xl border border-dashed border-neutral-800 hover:border-violet-500/60 bg-neutral-950/40 hover:bg-violet-950/10 cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-violet-500/20 transition-all">
              <Wand2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] uppercase font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
              Custom Clone
            </span>
          </div>

          <div className="mt-3">
            <h4 className="text-xs font-bold text-neutral-200 group-hover:text-violet-300 transition-colors">
              Clone Any Voice from Audio
            </h4>
            <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
              Upload a 10s audio clip or record your own mic. Our AI analyzes acoustic quality, clarity & timbre.
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center text-[11px] font-semibold text-violet-400 group-hover:translate-x-0.5 transition-transform">
            <span>Launch Clone Studio &rarr;</span>
          </div>
        </div>

        {/* Cloned Voices (User Created) */}
        {showCloned &&
          clonedVoices.map((cv) => {
            const isSelected = selectedVoiceId === cv.id;
            return (
              <div
                key={cv.id}
                onClick={() => onSelectVoice(cv.id, true, cv)}
                className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-violet-500 bg-violet-950/20 shadow-lg shadow-violet-950/30 ring-1 ring-violet-500/50'
                    : 'border-neutral-800/90 hover:border-neutral-700 bg-neutral-900/60 hover:bg-neutral-900/90'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center font-bold text-xs">
                        {cv.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-1.5 truncate max-w-[130px]">
                          {cv.name}
                        </h4>
                        <span className="text-[10px] text-violet-300 font-medium">
                          Base: {cv.baseVoice}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {cv.sampleCount && cv.sampleCount > 1 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {cv.sampleCount} Samples
                        </span>
                      )}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        Cloned
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClonedVoice(cv.id);
                        }}
                        className="p-1 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                        title="Delete cloned voice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed mt-1">
                    {cv.stylePrompt}
                  </p>

                  {/* Quality Pill */}
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-neutral-400">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Suitability: {cv.quality?.overallSuitability || 'Good'}</span>
                    <span className="text-neutral-600">•</span>
                    <span>Clarity: {cv.quality?.clarityScore ?? 85}%</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1 flex-wrap">
                    {cv.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {isSelected && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-violet-400">
                      <Check className="w-3.5 h-3.5" />
                      Active Voice
                    </span>
                  )}
                </div>
              </div>
            );
          })}

        {/* Preset Voices */}
        {filteredPresets.map((preset) => {
          const isSelected = selectedVoiceId === preset.id;
          const isLoadingPreview = previewLoadingId === preset.id;

          return (
            <div
              key={preset.id}
              onClick={() => onSelectVoice(preset.id, false, preset)}
              className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-950/30 ring-1 ring-indigo-500/50'
                  : 'border-neutral-800/90 hover:border-neutral-700 bg-neutral-900/60 hover:bg-neutral-900/90'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {preset.baseVoice.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-100 truncate max-w-[140px]">
                        {preset.name}
                      </h4>
                      <span className="text-[10px] text-neutral-400 block">
                        {preset.category}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700/50">
                    {preset.gender}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>

                {/* Sample Quote Preview Button */}
                <div className="mt-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewSampleQuote(preset.sampleQuote, preset.baseVoice, preset.stylePrompt);
                    }}
                    disabled={isLoadingPreview}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 p-1 rounded-md hover:bg-indigo-950/30 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isLoadingPreview ? 'Synthesizing...' : 'Hear Voice Preview'}</span>
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1 flex-wrap">
                  {preset.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {isSelected && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400">
                    <Check className="w-3.5 h-3.5" />
                    Active
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
