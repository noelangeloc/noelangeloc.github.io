export interface VoicePreset {
  id: string;
  name: string;
  gender: string;
  baseVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Aoede' | string;
  category: string;
  description: string;
  stylePrompt: string;
  tags: string[];
  sampleQuote: string;
}

export interface SampleAssessment {
  sampleIndex: number;
  name?: string;
  clarityScore: number;
  backgroundNoiseScore: number;
  suitability: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  note: string;
}

export interface AudioQualityReport {
  clarityScore: number; // 0 - 100
  clarityDescription: string;
  backgroundNoiseLevel: string; // e.g. "Low / Clean Studio", "Moderate", "High"
  backgroundNoiseScore: number; // 0 - 100 (cleanliness)
  noiseDescription: string;
  speechDistinctiveness: string; // "High" | "Moderate" | "Low"
  distinctivenessDescription: string;
  overallSuitability: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  actionableFeedback: string;
  improvementSuggestions: string[];
  sampleBreakdown?: SampleAssessment[];
}

export interface ClonedVoiceProfile {
  id: string;
  name: string;
  isCloned: boolean;
  baseVoice: string;
  gender: string;
  stylePrompt: string;
  quality: AudioQualityReport;
  analysis: {
    pitch: string;
    timbre: string;
    pacing: string;
    emotion: string;
    accent: string;
    transcription: string;
  };
  tags: string[];
  confidence: number;
  createdAt: string;
  audioSampleUrl?: string;
  sampleCount?: number;
  sampleNames?: string[];
}

export interface VoiceSampleItem {
  id: string;
  file: Blob | File;
  name: string;
  url: string;
  type: string;
  sizeFormatted?: string;
  durationSec?: number;
}

export interface GeneratedAudioItem {
  id: string;
  text: string;
  audioBase64: string;
  audioUrl: string;
  mimeType: string;
  durationSec: number;
  voiceName: string;
  voiceId: string;
  isCloned: boolean;
  model: string;
  styleUsed: string;
  timestamp: string;
}
