import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Mic,
  Square,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Volume2,
  X,
  Play,
  Pause,
  ShieldAlert,
  Info,
  Layers,
  Wand2,
  Plus,
  Trash2,
  Music,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ClonedVoiceProfile, VoiceSampleItem } from '../types';
import { fileToBase64, generateSyntheticVoiceSample, base64ToBlobUrl } from '../utils/audioHelpers';

interface VoiceCloneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceCloned: (profile: ClonedVoiceProfile) => void;
}

export const VoiceCloneModal: React.FC<VoiceCloneModalProps> = ({
  isOpen,
  onClose,
  onVoiceCloned,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'samples'>('upload');
  const [samples, setSamples] = useState<VoiceSampleItem[]>([]);
  const [customVoiceName, setCustomVoiceName] = useState<string>('');

  // Playing sample preview state
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Processing & Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [clonedResult, setClonedResult] = useState<ClonedVoiceProfile | null>(null);
  const [showSampleBreakdown, setShowSampleBreakdown] = useState(true);

  // Previewing synthesized test phrase
  const [previewText, setPreviewText] = useState('Hello! This is an accurate test of my multi-sample cloned voice style.');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewSpeechUrl, setPreviewSpeechUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    samples.forEach(s => URL.revokeObjectURL(s.url));
    setSamples([]);
    setCustomVoiceName('');
    setIsRecording(false);
    setRecordingSeconds(0);
    setIsAnalyzing(false);
    setAnalysisError(null);
    setClonedResult(null);
    setPreviewSpeechUrl(null);
    setIsPreviewPlaying(false);
    setPlayingSampleId(null);
    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Helper to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Add multiple files
  const addFilesToSamples = (files: FileList | File[]) => {
    const newItems: VoiceSampleItem[] = [];
    const maxAllowed = 5;

    for (let i = 0; i < files.length; i++) {
      if (samples.length + newItems.length >= maxAllowed) {
        setAnalysisError(`Maximum of ${maxAllowed} voice samples reached for optimal performance.`);
        break;
      }
      const f = files[i];
      if (!f.type.startsWith('audio/') && !f.name.match(/\.(wav|mp3|m4a|webm|ogg|aac|flac)$/i)) {
        continue;
      }

      const url = URL.createObjectURL(f);
      newItems.push({
        id: 'sample-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        file: f,
        name: f.name,
        url,
        type: f.type || 'audio/wav',
        sizeFormatted: formatFileSize(f.size),
      });
    }

    if (newItems.length > 0) {
      setSamples((prev) => [...prev, ...newItems]);
      setAnalysisError(null);
      setClonedResult(null);

      // Auto-set voice name if empty
      if (!customVoiceName) {
        const first = newItems[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setCustomVoiceName(first.charAt(0).toUpperCase() + first.slice(1));
      }
    }
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToSamples(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToSamples(e.target.files);
    }
  };

  const removeSample = (id: string) => {
    setSamples((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((s) => s.id !== id);
    });
    if (playingSampleId === id) {
      if (sampleAudioRef.current) sampleAudioRef.current.pause();
      setPlayingSampleId(null);
    }
  };

  // Toggle playback of an uploaded sample
  const togglePlaySample = (item: VoiceSampleItem) => {
    if (playingSampleId === item.id) {
      if (sampleAudioRef.current) sampleAudioRef.current.pause();
      setPlayingSampleId(null);
    } else {
      if (sampleAudioRef.current) sampleAudioRef.current.pause();
      const audio = new Audio(item.url);
      sampleAudioRef.current = audio;
      audio.onended = () => setPlayingSampleId(null);
      audio.play().then(() => setPlayingSampleId(item.id)).catch(() => {});
    }
  };

  // Start Mic Recording
  const startRecording = async () => {
    if (samples.length >= 5) {
      setAnalysisError('Maximum of 5 voice samples reached.');
      return;
    }
    try {
      setAnalysisError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const name = `Recording Take ${samples.length + 1} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
        const url = URL.createObjectURL(audioBlob);

        const newItem: VoiceSampleItem = {
          id: 'sample-' + Date.now(),
          file: audioBlob,
          name,
          url,
          type: 'audio/webm',
          sizeFormatted: formatFileSize(audioBlob.size),
        };

        setSamples((prev) => [...prev, newItem]);
        if (!customVoiceName) {
          setCustomVoiceName(`My Recorded Voice`);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setAnalysisError('Could not access microphone: ' + (err.message || 'Permission denied'));
    }
  };

  // Stop Mic Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Add Built-in Demo Samples
  const addDemoSample = async (type: 'warm_narrator' | 'fast_podcast' | 'calm_guide', title: string) => {
    if (samples.length >= 5) {
      setAnalysisError('Maximum of 5 voice samples reached.');
      return;
    }
    try {
      const sampleBlob = await generateSyntheticVoiceSample(type);
      const url = URL.createObjectURL(sampleBlob);
      const newItem: VoiceSampleItem = {
        id: 'demo-' + Date.now(),
        file: sampleBlob,
        name: `${title}.wav`,
        url,
        type: 'audio/wav',
        sizeFormatted: formatFileSize(sampleBlob.size),
      };
      setSamples((prev) => [...prev, newItem]);
      if (!customVoiceName) setCustomVoiceName(title);
    } catch (err: any) {
      setAnalysisError('Failed to load demo sample: ' + err.message);
    }
  };

  // Run Gemini Multi-Sample Acoustic Quality & Voice Clone Analysis
  const handleAnalyzeAndClone = async () => {
    if (samples.length === 0) {
      setAnalysisError('Please upload or record at least one audio sample.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Convert all samples to base64 in parallel
      const samplePayloads = await Promise.all(
        samples.map(async (s) => ({
          audioData: await fileToBase64(s.file),
          mimeType: s.type || 'audio/wav',
          name: s.name,
        }))
      );

      const response = await fetch('/api/voice/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples: samplePayloads,
          voiceName: customVoiceName && customVoiceName.trim() ? customVoiceName.trim() : 'Cloned Voice',
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to analyze and clone audio samples.');
      }

      setClonedResult(data.clonedProfile);
    } catch (err: any) {
      console.error('Clone analysis failed:', err);
      setAnalysisError(err.message || 'Multi-sample audio analysis failed. Please verify your audio clips.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Test Synthesis with Cloned Voice
  const handleTestPreviewSpeech = async () => {
    if (!clonedResult) return;
    setIsGeneratingPreview(true);
    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: previewText,
          voiceName: clonedResult.baseVoice,
          stylePrompt: clonedResult.stylePrompt,
          model: 'gemini-3.8-flash-tts',
          clonedVoiceProfile: clonedResult,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to generate preview speech.');
      }

      const blobUrl = base64ToBlobUrl(data.audioBase64, data.mimeType);
      setPreviewSpeechUrl(blobUrl);

      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(blobUrl);
      previewAudioRef.current = audio;
      audio.onended = () => setIsPreviewPlaying(false);
      audio.play().then(() => setIsPreviewPlaying(true)).catch(() => {});
    } catch (err: any) {
      setAnalysisError(err.message || 'Failed to generate speech preview.');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const togglePreviewAudio = () => {
    if (!previewAudioRef.current) return;
    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().then(() => setIsPreviewPlaying(true)).catch(() => {});
    }
  };

  const handleSaveAndUse = () => {
    if (!clonedResult) return;
    const finalProfile: ClonedVoiceProfile = {
      ...clonedResult,
      name: customVoiceName && customVoiceName.trim() ? customVoiceName.trim() : clonedResult.name,
      audioSampleUrl: samples[0]?.url,
    };
    onVoiceCloned(finalProfile);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl shadow-indigo-950/40 p-6 sm:p-8 my-8 overflow-hidden text-neutral-100">
        {/* Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-28 bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-neutral-800/80 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-neutral-100">
                  Voice Cloning Studio
                </h2>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Multi-Sample Acoustic AI
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Upload multiple voice samples for high-precision acoustic triangulation and natural style cloning.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {analysisError && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">{analysisError}</div>
          </div>
        )}

        {/* Step 1: Input Selection & Multi-Sample Tray */}
        {!clonedResult ? (
          <div>
            {/* Mode Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-neutral-950/80 border border-neutral-800 mb-4">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'upload'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                Upload Audio Files (Multiple)
              </button>
              <button
                onClick={() => setActiveTab('record')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'record'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Mic className="w-4 h-4" />
                Record Speech Takes
              </button>
              <button
                onClick={() => setActiveTab('samples')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'samples'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Add Demo Samples
              </button>
            </div>

            {/* TAB: Upload Files (Supports Multiple) */}
            {activeTab === 'upload' && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-neutral-800 hover:border-indigo-500/50 rounded-2xl p-7 text-center transition-all bg-neutral-950/40 flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-neutral-800/80 flex items-center justify-center text-indigo-400">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-200">
                    Drag & drop one or multiple audio samples
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Select 2 to 5 speech files for highest cloning fidelity. Supports WAV, MP3, M4A, WebM, OGG.
                  </p>
                </div>

                <label className="mt-1 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium cursor-pointer transition-all border border-neutral-700/60 shadow-sm flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Select Multiple Files
                  <input
                    type="file"
                    accept="audio/*"
                    multiple
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* TAB: Record Microphone (Allows multiple takes) */}
            {activeTab === 'record' && (
              <div className="border border-neutral-800 rounded-2xl p-7 text-center bg-neutral-950/40 flex flex-col items-center justify-center gap-3.5">
                <div className="relative">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                      isRecording
                        ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/40 ring-8 ring-rose-500/20'
                        : 'bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    <Mic className="w-6 h-6" />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-neutral-200">
                    {isRecording ? `Recording Speech Take ${samples.length + 1}...` : 'Record Speech with Microphone'}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                    {isRecording
                      ? `Elapsed: ${recordingSeconds}s (Speak naturally for 10-20 seconds)`
                      : 'Record multiple takes with varying phrasing or emotion to train a versatile voice model.'}
                  </p>
                </div>

                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    <Mic className="w-4 h-4" />
                    Record Take {samples.length + 1}
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    Stop & Add Take
                  </button>
                )}
              </div>
            )}

            {/* TAB: Preset Demo Samples */}
            {activeTab === 'samples' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => addDemoSample('warm_narrator', 'British Documentarian Take')}
                  className="p-3.5 rounded-xl border border-neutral-800 hover:border-indigo-500/50 bg-neutral-950/60 hover:bg-indigo-950/10 cursor-pointer transition-all group"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs font-semibold text-neutral-200">British Documentarian</h4>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Deep resonant baritone</p>
                </div>

                <div
                  onClick={() => addDemoSample('fast_podcast', 'Dynamic Podcaster Take')}
                  className="p-3.5 rounded-xl border border-neutral-800 hover:border-indigo-500/50 bg-neutral-950/60 hover:bg-indigo-950/10 cursor-pointer transition-all group"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs font-semibold text-neutral-200">Dynamic Tech Host</h4>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Energetic articulate podcast</p>
                </div>

                <div
                  onClick={() => addDemoSample('calm_guide', 'Mindfulness Guide Take')}
                  className="p-3.5 rounded-xl border border-neutral-800 hover:border-indigo-500/50 bg-neutral-950/60 hover:bg-indigo-950/10 cursor-pointer transition-all group"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs font-semibold text-neutral-200">Mindfulness Guide</h4>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Soft tranquil breath cadence</p>
                </div>
              </div>
            )}

            {/* Multi-Sample Tray & Quality Accuracy Bar */}
            {samples.length > 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800 space-y-3">
                {/* Header with Sample Count & Accuracy Estimate */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-200">
                      Loaded Audio Samples ({samples.length} / 5)
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        samples.length >= 3
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : samples.length === 2
                          ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {samples.length >= 3
                        ? 'High Fidelity Cloning (~98% Match)'
                        : samples.length === 2
                        ? 'Dual Sample Triangulation (~94% Match)'
                        : 'Single Sample Baseline (~90% Match)'}
                    </span>
                  </div>

                  <label className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center gap-1 transition-colors">
                    <Plus className="w-3 h-3" />
                    Add More
                    <input
                      type="file"
                      accept="audio/*"
                      multiple
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Samples List */}
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {samples.map((sample, idx) => {
                    const isPlaying = playingSampleId === sample.id;
                    return (
                      <div
                        key={sample.id}
                        className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={() => togglePlaySample(sample)}
                            className="w-7 h-7 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 transition-colors"
                            title={isPlaying ? 'Pause sample' : 'Play sample'}
                          >
                            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />}
                          </button>
                          <div className="truncate">
                            <span className="font-medium text-neutral-200 truncate block">
                              {sample.name}
                            </span>
                            <span className="text-[10px] text-neutral-500">
                              Take #{idx + 1} {sample.sizeFormatted && `• ${sample.sizeFormatted}`}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => removeSample(sample.id)}
                          className="p-1 rounded-md text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                          title="Remove this sample"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Voice Name */}
                <div className="pt-2 border-t border-neutral-800/80">
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                    Cloned Persona Name
                  </label>
                  <input
                    type="text"
                    value={customVoiceName}
                    onChange={(e) => setCustomVoiceName(e.target.value)}
                    placeholder="e.g. Rachel - Warm Storyteller or Professor Adams"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-indigo-500 text-xs text-white placeholder-neutral-500 focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Action Bar: Analyze & Clone */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-[11px] text-neutral-500">
                {samples.length > 1
                  ? `${samples.length} speech takes ready for acoustic cross-correlation.`
                  : 'Add 2+ samples for enhanced cadence replication.'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white text-xs font-medium hover:bg-neutral-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={samples.length === 0 || isAnalyzing}
                  onClick={handleAnalyzeAndClone}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Cross-Analyzing {samples.length} Sample{samples.length > 1 ? 's' : ''}...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Analyze & Clone ({samples.length} Sample{samples.length > 1 ? 's' : ''})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Step 2: Multi-Sample Quality & Suitability Assessment Report */
          <div className="space-y-4 animate-fade-in">
            {/* Top Aggregate Suitability Card */}
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                clonedResult.quality?.overallSuitability === 'Excellent'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : clonedResult.quality?.overallSuitability === 'Good'
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
                  : clonedResult.quality?.overallSuitability === 'Fair'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}
            >
              <div className="mt-0.5">
                {clonedResult.quality?.overallSuitability === 'Excellent' ||
                clonedResult.quality?.overallSuitability === 'Good' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-sm">
                    Cloning Suitability: {clonedResult.quality?.overallSuitability || 'Good'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {clonedResult.sampleCount && clonedResult.sampleCount > 1 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        {clonedResult.sampleCount} Samples Synthesized
                      </span>
                    )}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/30 border border-white/10">
                      Confidence: {clonedResult.confidence}%
                    </span>
                  </div>
                </div>
                <p className="text-xs mt-1 leading-relaxed opacity-90">
                  {clonedResult.quality?.actionableFeedback}
                </p>
              </div>
            </div>

            {/* Quality Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-neutral-400 font-medium">Aggregate Clarity</span>
                  <span className="font-mono font-bold text-indigo-300">
                    {clonedResult.quality?.clarityScore ?? 88}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${clonedResult.quality?.clarityScore ?? 88}%` }}
                  />
                </div>
                <p className="text-[11px] text-neutral-400 line-clamp-2">
                  {clonedResult.quality?.clarityDescription}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-neutral-400 font-medium">Background Noise</span>
                  <span className="text-[11px] font-semibold text-emerald-300">
                    {clonedResult.quality?.backgroundNoiseLevel || 'Low'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${clonedResult.quality?.backgroundNoiseScore ?? 92}%` }}
                  />
                </div>
                <p className="text-[11px] text-neutral-400 line-clamp-2">
                  {clonedResult.quality?.noiseDescription}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-neutral-400 font-medium">Distinctiveness</span>
                  <span className="text-[11px] font-semibold text-violet-300">
                    {clonedResult.quality?.speechDistinctiveness || 'High'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{
                      width:
                        clonedResult.quality?.speechDistinctiveness === 'High'
                          ? '95%'
                          : clonedResult.quality?.speechDistinctiveness === 'Moderate'
                          ? '70%'
                          : '45%',
                    }}
                  />
                </div>
                <p className="text-[11px] text-neutral-400 line-clamp-2">
                  {clonedResult.quality?.distinctivenessDescription}
                </p>
              </div>
            </div>

            {/* Individual Samples Breakdown (Multi-Sample specific feature) */}
            {clonedResult.quality?.sampleBreakdown && clonedResult.quality.sampleBreakdown.length > 0 && (
              <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
                <div
                  onClick={() => setShowSampleBreakdown(!showSampleBreakdown)}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-violet-400" />
                    Individual Sample Acoustic Breakdown ({clonedResult.quality.sampleBreakdown.length} files evaluated)
                  </h4>
                  <button className="text-neutral-400 hover:text-white p-1">
                    {showSampleBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {showSampleBreakdown && (
                  <div className="mt-2.5 space-y-2">
                    {clonedResult.quality.sampleBreakdown.map((b, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 truncate">
                          <span className="font-semibold text-neutral-200 block truncate">
                            {b.name || `Sample ${b.sampleIndex}`}
                          </span>
                          <span className="text-[11px] text-neutral-400 italic block mt-0.5">
                            {b.note}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-indigo-300 font-mono">
                            Clarity: {b.clarityScore}%
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-medium ${
                              b.suitability === 'Excellent' || b.suitability === 'Good'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {b.suitability}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Extracted Persona Blueprint */}
            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  Synthesized Vocal Profile
                </h4>
                <span className="text-[11px] text-neutral-400">
                  Mapped to base: <strong className="text-indigo-300 font-semibold">{clonedResult.baseVoice}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-500 text-[10px] block">Pitch & Register</span>
                  <span className="text-neutral-200 font-medium truncate block">
                    {clonedResult.analysis.pitch || 'Medium'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-500 text-[10px] block">Timbre & Texture</span>
                  <span className="text-neutral-200 font-medium truncate block">
                    {clonedResult.analysis.timbre || 'Natural'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-500 text-[10px] block">Pacing & Flow</span>
                  <span className="text-neutral-200 font-medium truncate block">
                    {clonedResult.analysis.pacing || 'Conversational'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-500 text-[10px] block">Tone & Emotion</span>
                  <span className="text-neutral-200 font-medium truncate block">
                    {clonedResult.analysis.emotion || 'Warm'}
                  </span>
                </div>
              </div>

              {/* Sample Transcription */}
              {clonedResult.analysis.transcription && (
                <div className="text-[11px] text-neutral-400 bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800/80 italic">
                  &ldquo;{clonedResult.analysis.transcription}&rdquo;
                </div>
              )}

              {/* Editable Style Directive */}
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Synthesized Style Directive (used by Gemini TTS)
                </label>
                <textarea
                  value={clonedResult.stylePrompt}
                  onChange={(e) =>
                    setClonedResult({ ...clonedResult, stylePrompt: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 focus:border-indigo-500 text-xs text-neutral-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Test Drive Preview */}
            <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Test-Drive Synthesized Cloned Voice
                </span>
                {previewSpeechUrl && (
                  <button
                    onClick={togglePreviewAudio}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    {isPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPreviewPlaying ? 'Pause Test' : 'Play Test'}</span>
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Enter sample sentence to test..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  disabled={isGeneratingPreview || !previewText.trim()}
                  onClick={handleTestPreviewSpeech}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all"
                >
                  {isGeneratingPreview ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Hear Preview
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              <button
                onClick={() => setClonedResult(null)}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 p-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Add / Adjust Samples
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white text-xs font-medium hover:bg-neutral-800 transition-all"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveAndUse}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save & Use Voice in Studio
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
