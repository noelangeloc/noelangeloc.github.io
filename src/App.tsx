/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { AudioVisualizer } from './components/AudioVisualizer';
import { VoicePicker } from './components/VoicePicker';
import { TextStudio } from './components/TextStudio';
import { GenerationHistory } from './components/GenerationHistory';
import { VoiceCloneModal } from './components/VoiceCloneModal';
import { VoicePreset, ClonedVoiceProfile, GeneratedAudioItem } from './types';
import { base64ToBlobUrl } from './utils/audioHelpers';
import { AlertCircle, CheckCircle2, Sparkles, Volume2, Wand2 } from 'lucide-react';

const FALLBACK_PRESETS: VoicePreset[] = [
  {
    id: 'kore-news',
    name: 'Kore - News Anchor',
    gender: 'Female',
    baseVoice: 'Kore',
    category: 'Broadcast & News',
    description: 'Clear, articulate, calm, and authoritative journalistic delivery.',
    stylePrompt: 'Clear, professional news anchor. Articulate enunciation, measured cadence, authoritative and steady tone.',
    tags: ['Journalistic', 'Clear', 'Authoritative', 'Calm'],
    sampleQuote: 'Good evening. Here are today’s top headlines from around the world.',
  },
  {
    id: 'fenrir-cinematic',
    name: 'Fenrir - Epic Narrator',
    gender: 'Male',
    baseVoice: 'Fenrir',
    category: 'Narrative & Drama',
    description: 'Deep, resonant, dramatic baritone suited for trailers and audiobooks.',
    stylePrompt: 'Deep resonant voice, dramatic pauses, cinematic documentary narrator. Mysterious, commanding, and rich.',
    tags: ['Deep', 'Cinematic', 'Documentary', 'Resonant'],
    sampleQuote: 'In a forgotten age, beyond the outer rim of civilization, a legend was born.',
  },
  {
    id: 'puck-podcast',
    name: 'Puck - Energetic Host',
    gender: 'Male',
    baseVoice: 'Puck',
    category: 'Conversational',
    description: 'Upbeat, friendly, engaging, and dynamic podcast interviewer.',
    stylePrompt: 'Enthusiastic, bright podcast host. Dynamic vocal variety, conversational rhythm, warm and relatable.',
    tags: ['Enthusiastic', 'Podcast', 'Upbeat', 'Friendly'],
    sampleQuote: 'Welcome back to the show everyone! Today we are breaking down a truly mind-blowing breakthrough.',
  },
  {
    id: 'aoede-storyteller',
    name: 'Aoede - Bedtime Storyteller',
    gender: 'Female',
    baseVoice: 'Aoede',
    category: 'Narrative & Drama',
    description: 'Warm, soothing, fairy-tale intimacy with gentle, melodic cadence.',
    stylePrompt: 'Warm, soothing, cozy bedtime storyteller. Soft lilting cadence, gentle breathy warmth, enchanting tone.',
    tags: ['Soothing', 'Cozy', 'Fairy Tale', 'Gentle'],
    sampleQuote: 'Once upon a starlit evening, nestled deep within the whispering pine forest, slept a tiny owl.',
  },
  {
    id: 'zephyr-tech',
    name: 'Zephyr - Casual Tech Explainer',
    gender: 'Neutral / Male',
    baseVoice: 'Zephyr',
    category: 'Conversational',
    description: 'Breezy, modern, articulate, and naturally curious tech reviewer.',
    stylePrompt: 'Casual tech reviewer. Natural pacing, conversational cadence, crisp modern phrasing, approachable tone.',
    tags: ['Tech', 'Modern', 'Casual', 'Breezy'],
    sampleQuote: 'Let’s walk through how this architecture works under the hood, step by step.',
  },
  {
    id: 'charon-executive',
    name: 'Charon - Executive Briefing',
    gender: 'Male',
    baseVoice: 'Charon',
    category: 'Corporate & Education',
    description: 'Prestigious, steady, mature, and distinguished corporate speaker.',
    stylePrompt: 'Executive keynote speaker. Mature, polished, steady pace, confident cadence, refined and distinguished.',
    tags: ['Executive', 'Polished', 'Distinguished', 'Steady'],
    sampleQuote: 'Our quarterly metrics demonstrate resilient growth across all critical operational sectors.',
  },
  {
    id: 'kore-meditation',
    name: 'Kore - Mindfulness & Zen',
    gender: 'Female',
    baseVoice: 'Kore',
    category: 'Wellness',
    description: 'Ultra-gentle, slow-tempo, meditative whisper with rhythmic breathing.',
    stylePrompt: 'Mindfulness meditation guide. Very slow pacing, soft whispering breath, tranquil and grounding delivery.',
    tags: ['Mindfulness', 'Whisper', 'Tranquil', 'Slow'],
    sampleQuote: 'Take a deep, slow breath in through your nose... hold... and gently let it release.',
  },
  {
    id: 'puck-game-announcer',
    name: 'Puck - Esports Announcer',
    gender: 'Male',
    baseVoice: 'Puck',
    category: 'Entertainment',
    description: 'High-octane, fast-paced, hype-fueled stadium commentator.',
    stylePrompt: 'High-energy esports commentator. Rapid cadence, intense excitement, punchy emphasis and exclamation.',
    tags: ['High-Energy', 'Hype', 'Gaming', 'Fast-Paced'],
    sampleQuote: 'He makes the turn, clutches the round with two seconds left on the clock! Unbelievable play!',
  },
];

// Pre-seeded cloned voice so users have an immediate example of cloned voice style
const INITIAL_CLONED_VOICES: ClonedVoiceProfile[] = [
  {
    id: 'cloned-sir-david',
    name: 'Sir David - Wildlife Guide',
    isCloned: true,
    baseVoice: 'Fenrir',
    gender: 'Masculine',
    stylePrompt:
      'Warm British nature documentary narrator. Gentle reverence, hushed pauses, breathy awe, articulate enunciation.',
    quality: {
      clarityScore: 94,
      clarityDescription: 'Pristine acoustic clarity with rich vocal harmonics and zero clipping.',
      backgroundNoiseLevel: 'Low / Clean Studio',
      backgroundNoiseScore: 96,
      noiseDescription: 'Studio sound isolation, transparent noise floor.',
      speechDistinctiveness: 'High',
      distinctivenessDescription: 'Instantly recognizable venerable British cadence and warm baritone texture.',
      overallSuitability: 'Excellent',
      actionableFeedback: 'Studio reference sample with pristine vocal clarity and zero background artifacts.',
      improvementSuggestions: ['Ideal acoustic profile. Emulates documentary pacing and emotional depth.'],
    },
    analysis: {
      pitch: 'Rich baritone with warm lower-mid presence',
      timbre: 'Velvety, slightly breathy, seasoned, resonant',
      pacing: 'Deliberate and thoughtful with poignant pauses',
      emotion: 'Curious, reverent, and enchanting',
      accent: 'British Received Pronunciation (RP)',
      transcription: 'Here, in the heart of the ancient rainforest, life thrives in astonishing diversity.',
    },
    tags: ['Wildlife', 'British RP', 'Resonant', 'Documentary'],
    confidence: 96,
    createdAt: new Date().toISOString(),
  },
];

export default function App() {
  const [presets, setPresets] = useState<VoicePreset[]>(FALLBACK_PRESETS);
  const [clonedVoices, setClonedVoices] = useState<ClonedVoiceProfile[]>(() => {
    try {
      const saved = localStorage.getItem('vocalis_cloned_voices');
      return saved ? JSON.parse(saved) : INITIAL_CLONED_VOICES;
    } catch {
      return INITIAL_CLONED_VOICES;
    }
  });

  // Selected Voice State
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('kore-news');
  const [selectedVoiceData, setSelectedVoiceData] = useState<VoicePreset | ClonedVoiceProfile>(
    FALLBACK_PRESETS[0]
  );
  const [isClonedVoice, setIsClonedVoice] = useState<boolean>(false);

  // Script & Synthesis Controls
  const [scriptText, setScriptText] = useState<string>(
    'Welcome to Vocalis Studio. <breath> You can type any text here, choose from our expressive voice catalog, or clone your own voice by uploading an audio sample.'
  );
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash-tts' | 'gemini-3.8-flash-lite-tts'>(
    'gemini-3.8-flash-tts'
  );
  const [stylePrompt, setStylePrompt] = useState<string>('');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('Natural / Neutral');
  const [selectedPace, setSelectedPace] = useState<string>('normal');

  // Generation & Playback State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [currentDuration, setCurrentDuration] = useState<number>(0);
  const [activeItemText, setActiveItemText] = useState<string>('');
  const [activeVoiceName, setActiveVoiceName] = useState<string>('Kore - News Anchor');
  const [activeIsCloned, setActiveIsCloned] = useState<boolean>(false);

  // History
  const [history, setHistory] = useState<GeneratedAudioItem[]>(() => {
    try {
      const saved = localStorage.getItem('vocalis_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // Modal & Previewing State
  const [isCloneModalOpen, setIsCloneModalOpen] = useState<boolean>(false);
  const [serverOk, setServerOk] = useState<boolean>(true);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'error' } | null>(
    null
  );

  // Check health and load preset voices from server on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'ok') setServerOk(true);
      })
      .catch(() => setServerOk(false));

    fetch('/api/voices')
      .then((res) => res.json())
      .then((data) => {
        if (data.presets && Array.isArray(data.presets)) {
          setPresets(data.presets);
        }
      })
      .catch((err) => console.log('Using local fallback presets:', err));
  }, []);

  // Sync cloned voices to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vocalis_cloned_voices', JSON.stringify(clonedVoices));
    } catch (e) {
      console.warn('Failed to save cloned voices to localStorage:', e);
    }
  }, [clonedVoices]);

  // Sync history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vocalis_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save history to localStorage:', e);
    }
  }, [history]);

  const showToast = (title: string, desc: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle Voice Selection
  const handleSelectVoice = (
    id: string,
    cloned: boolean,
    voiceData: VoicePreset | ClonedVoiceProfile
  ) => {
    setSelectedVoiceId(id);
    setIsClonedVoice(cloned);
    setSelectedVoiceData(voiceData);
    showToast(
      'Voice Selected',
      `Switched voice persona to ${voiceData.name}`,
      'success'
    );
  };

  // Handle Voice Cloned from Modal
  const handleVoiceCloned = (profile: ClonedVoiceProfile) => {
    setClonedVoices((prev) => [profile, ...prev.filter((p) => p.id !== profile.id)]);
    setSelectedVoiceId(profile.id);
    setIsClonedVoice(true);
    setSelectedVoiceData(profile);
    showToast(
      'Voice Cloned Successfully!',
      `"${profile.name}" is now ready to speak your text.`,
      'success'
    );
  };

  // Delete Cloned Voice
  const handleDeleteClonedVoice = (id: string) => {
    setClonedVoices((prev) => prev.filter((v) => v.id !== id));
    if (selectedVoiceId === id) {
      setSelectedVoiceId(presets[0]?.id || 'kore-news');
      setIsClonedVoice(false);
      setSelectedVoiceData(presets[0]);
    }
    showToast('Voice Removed', 'Cloned voice profile was deleted.', 'success');
  };

  // Generate Main Speech Audio
  const handleGenerateSpeech = async () => {
    if (!scriptText.trim()) {
      showToast('Script Empty', 'Please enter some text to speak.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const payload: any = {
        text: scriptText,
        voiceName: selectedVoiceData.baseVoice || 'Kore',
        stylePrompt: stylePrompt.trim() || selectedVoiceData.stylePrompt,
        model: selectedModel,
        emotion: selectedEmotion === 'Natural / Neutral' ? '' : selectedEmotion,
        pace: selectedPace,
      };

      if (isClonedVoice) {
        payload.clonedVoiceProfile = selectedVoiceData;
      }

      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to generate speech with Gemini TTS.');
      }

      const blobUrl = base64ToBlobUrl(data.audioBase64, data.mimeType);
      setCurrentAudioUrl(blobUrl);
      setCurrentDuration(data.durationSec || 0);
      setActiveItemText(scriptText);
      setActiveVoiceName(selectedVoiceData.name);
      setActiveIsCloned(isClonedVoice);

      // Add to history
      const newItem: GeneratedAudioItem = {
        id: 'gen-' + Date.now(),
        text: scriptText,
        audioBase64: data.audioBase64,
        audioUrl: blobUrl,
        mimeType: data.mimeType,
        durationSec: data.durationSec,
        voiceName: selectedVoiceData.name,
        voiceId: selectedVoiceId,
        isCloned: isClonedVoice,
        model: selectedModel,
        styleUsed: data.styleUsed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setHistory((prev) => [newItem, ...prev]);
      setActiveHistoryId(newItem.id);

      showToast(
        'Speech Generated!',
        `Rendered in ${data.durationSec}s with ${selectedVoiceData.name}.`,
        'success'
      );
    } catch (err: any) {
      console.error('Speech generation failed:', err);
      showToast('Generation Failed', err.message || 'Error communicating with Gemini TTS.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Preview Voice Sample Quote
  const handlePreviewSampleQuote = async (
    sampleText: string,
    voiceName: string,
    style: string
  ) => {
    setPreviewLoadingId(voiceName);
    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          voiceName,
          stylePrompt: style,
          model: 'gemini-3.8-flash-tts',
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error);

      const blobUrl = base64ToBlobUrl(data.audioBase64, data.mimeType);
      setCurrentAudioUrl(blobUrl);
      setCurrentDuration(data.durationSec);
      setActiveItemText(sampleText);
      setActiveVoiceName(voiceName);
      setActiveIsCloned(false);

      // Play audio automatically
      const audio = new Audio(blobUrl);
      audio.play().catch(() => {});
    } catch (err: any) {
      showToast('Preview Error', err.message || 'Could not load sample preview.', 'error');
    } finally {
      setPreviewLoadingId(null);
    }
  };

  // Select Item from History
  const handleSelectHistoryItem = (item: GeneratedAudioItem) => {
    setCurrentAudioUrl(item.audioUrl);
    setCurrentDuration(item.durationSec);
    setActiveItemText(item.text);
    setActiveVoiceName(item.voiceName);
    setActiveIsCloned(item.isCloned);
    setActiveHistoryId(item.id);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar Header */}
      <Header
        onOpenCloneModal={() => setIsCloneModalOpen(true)}
        serverOk={serverOk}
        clonedCount={clonedVoices.length}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 animate-bounce-subtle">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl ${
              toastMessage.type === 'success'
                ? 'bg-neutral-900/95 border-emerald-500/40 text-emerald-200 shadow-emerald-950/20'
                : 'bg-neutral-900/95 border-rose-500/40 text-rose-200 shadow-rose-950/20'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div>
              <p className="text-xs font-bold text-white">{toastMessage.title}</p>
              <p className="text-[11px] text-neutral-300 opacity-90">{toastMessage.desc}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Studio Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero Banner / Quick Info */}
        <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-r from-neutral-900 via-indigo-950/40 to-neutral-900 border border-neutral-800/80 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Next-Gen Gemini Speech Synthesis & Voice Cloning
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Type text, hear it spoken, or clone any voice from audio.
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 mt-2 leading-relaxed">
              Explore studio-grade voice styles with backchanneling and vocal bursts, or upload a reference voice to replicate its timbre, cadence, and unique acoustic identity.
            </p>
          </div>
        </div>

        {/* Master Audio Player & Visualizer */}
        <AudioVisualizer
          audioUrl={currentAudioUrl}
          durationSec={currentDuration}
          voiceName={activeVoiceName}
          isCloned={activeIsCloned}
          text={activeItemText}
        />

        {/* Studio Grid: Script Editor + History (Left), Voice Picker (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Script Editor & History */}
          <div className="lg:col-span-7 space-y-6">
            <TextStudio
              text={scriptText}
              onTextChange={setScriptText}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              stylePrompt={stylePrompt}
              onStylePromptChange={setStylePrompt}
              selectedEmotion={selectedEmotion}
              onEmotionChange={setSelectedEmotion}
              selectedPace={selectedPace}
              onPaceChange={setSelectedPace}
              onGenerate={handleGenerateSpeech}
              isGenerating={isGenerating}
              activeVoiceName={selectedVoiceData?.name || 'Kore'}
              isClonedVoice={isClonedVoice}
            />

            <GenerationHistory
              items={history}
              activeItemId={activeHistoryId}
              onSelectItem={handleSelectHistoryItem}
              onDeleteItem={(id) => setHistory((prev) => prev.filter((h) => h.id !== id))}
              onClearAll={() => setHistory([])}
            />
          </div>

          {/* Right Column: Voice Library & Cloned Voices */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-100">Voice Library</h3>
                    <p className="text-[11px] text-neutral-400">
                      Choose an acoustic style or cloned voice persona
                    </p>
                  </div>
                </div>
              </div>

              <VoicePicker
                presets={presets}
                clonedVoices={clonedVoices}
                selectedVoiceId={selectedVoiceId}
                onSelectVoice={handleSelectVoice}
                onOpenCloneModal={() => setIsCloneModalOpen(true)}
                onDeleteClonedVoice={handleDeleteClonedVoice}
                onPreviewSampleQuote={handlePreviewSampleQuote}
                previewLoadingId={previewLoadingId}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Voice Clone Modal with In-depth Quality Assessment */}
      <VoiceCloneModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        onVoiceCloned={handleVoiceCloned}
      />
    </div>
  );
}
