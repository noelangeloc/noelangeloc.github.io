import React from 'react';
import {
  Clock,
  Play,
  Download,
  Trash2,
  Sparkles,
  Volume2,
  Check,
  RotateCcw,
} from 'lucide-react';
import { GeneratedAudioItem } from '../types';
import { downloadAudio, formatTime } from '../utils/audioHelpers';

interface GenerationHistoryProps {
  items: GeneratedAudioItem[];
  activeItemId: string | null;
  onSelectItem: (item: GeneratedAudioItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export const GenerationHistory: React.FC<GenerationHistoryProps> = ({
  items,
  activeItemId,
  onSelectItem,
  onDeleteItem,
  onClearAll,
}) => {
  if (items.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 text-center text-neutral-500 text-xs">
        <Clock className="w-5 h-5 mx-auto mb-2 text-neutral-600" />
        No audio generations recorded in this session yet. Synthesize your first clip above!
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
            Generation History & Library ({items.length})
          </h4>
        </div>
        <button
          onClick={onClearAll}
          className="text-[11px] text-neutral-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Clear All
        </button>
      </div>

      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {items.map((item) => {
          const isActive = activeItemId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isActive
                  ? 'border-indigo-500/80 bg-indigo-950/20 shadow-md ring-1 ring-indigo-500/40'
                  : 'border-neutral-800/80 hover:border-neutral-700 bg-neutral-950/50 hover:bg-neutral-900/60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-200 truncate">
                      {item.voiceName}
                    </span>
                    {item.isCloned && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-medium border border-violet-500/30">
                        Cloned
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {formatTime(item.durationSec)}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5 max-w-sm">
                    {item.text}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => downloadAudio(item.audioUrl, `vocalis-${item.voiceName.toLowerCase().replace(/\s+/g, '-')}-${item.id.slice(0, 5)}.wav`)}
                  title="Download WAV"
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteItem(item.id)}
                  title="Delete item"
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
