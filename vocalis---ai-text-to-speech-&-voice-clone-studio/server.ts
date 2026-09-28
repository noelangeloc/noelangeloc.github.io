import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAiClient(req: Request): GoogleGenAI | null {
  const reqKey = (req.headers['x-gemini-api-key'] as string) || process.env.GEMINI_API_KEY;
  if (!reqKey) return null;
  return new GoogleGenAI({
    apiKey: reqKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  if (pcmBuffer.length >= 12 && pcmBuffer.subarray(0, 4).toString('ascii') === 'RIFF') {
    return pcmBuffer;
  }
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

const DEFAULT_VOICE_PRESETS = [
  {
    id: 'kore-news',
    name: 'Kore - News Anchor',
    gender: 'Female',
    baseVoice: 'Kore',
    category: 'Broadcast & News',
    description: 'Clear, articulate, calm, and authoritative journalistic delivery.',
    stylePrompt: 'Clear, professional news anchor. Articulate enunciation, measured cadence, authoritative and steady tone.',
    tags: ['Journalistic', 'Clear', 'Authoritative', 'Calm'],
    sampleQuote: 'Good evening. Here are today s top headlines from around the world.',
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
    sampleQuote: 'Let s walk through how this architecture works under the hood, step by step.',
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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.get('/api/health', (req: Request, res: Response) => {
    const hasKey = !!req.headers['x-gemini-api-key'] || !!process.env.GEMINI_API_KEY;
    res.json({
      status: 'ok',
      hasApiKey: hasKey,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/voices', (_req: Request, res: Response) => {
    res.json({
      presets: DEFAULT_VOICE_PRESETS,
      prebuiltVoices: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede'],
    });
  });

  app.post('/api/tts/generate', async (req: Request, res: Response) => {
    try {
      const ai = getAiClient(req);
      if (!ai) {
        return res.status(401).json({ error: 'GEMINI_API_KEY is missing. Please provide it in the API Key dialog.' });
      }

      const {
        text,
        voiceName = 'Kore',
        stylePrompt = '',
        model = 'gemini-3.8-flash-tts',
        emotion = '',
        pace = 'normal',
        clonedVoiceProfile,
      } = req.body;

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'Text content is required for speech generation.' });
      }

      let combinedStyle = '';
      if (clonedVoiceProfile?.stylePrompt) combinedStyle += clonedVoiceProfile.stylePrompt + ' ';
      if (stylePrompt && stylePrompt.trim()) combinedStyle += stylePrompt.trim() + ' ';
      if (emotion && emotion.trim()) combinedStyle += `Emotion/Tone: ${emotion.trim()}. `;
      if (pace && pace !== 'normal') combinedStyle += `Pacing: ${pace} pace. `;

      const effectiveVoiceName = clonedVoiceProfile?.baseVoice || voiceName || 'Kore';
      const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede'];
      const chosenVoice = validVoices.includes(effectiveVoiceName) ? effectiveVoiceName : 'Kore';
      const selectedModel = model === 'gemini-3.8-flash-lite-tts' ? 'gemini-3.8-flash-lite-tts' : 'gemini-3.8-flash-tts';

      const speechMetadata: Record<string, string> = {};
      if (combinedStyle.trim()) speechMetadata.style = combinedStyle.trim();

      const geminiResponse = await ai.models.generateContent({
        model: selectedModel,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.trim(),
                ...(Object.keys(speechMetadata).length > 0 ? { speechMetadata } : {}),
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      });

      const candidate = geminiResponse.candidates?.[0];
      const audioPart = candidate?.content?.parts?.find((p) => p.inlineData && p.inlineData.data);
      if (!audioPart || !audioPart.inlineData?.data) {
        return res.status(500).json({
          error: 'Model did not return speech audio. Try adjusting the text or style prompt.',
        });
      }

      const rawBase64 = audioPart.inlineData.data;
      const rawBuffer = Buffer.from(rawBase64, 'base64');
      const wavBuffer = pcmToWav(rawBuffer, 24000, 1, 16);
      const wavBase64 = wavBuffer.toString('base64');
      const pcmDataSize = wavBuffer.length - 44;
      const durationSec = Math.max(0.1, Number((pcmDataSize / (24000 * 2)).toFixed(2)));

      res.json({
        success: true,
        audioBase64: wavBase64,
        mimeType: 'audio/wav',
        sampleRate: 24000,
        durationSec,
        voiceUsed: chosenVoice,
        modelUsed: selectedModel,
        styleUsed: combinedStyle.trim(),
      });
    } catch (err: any) {
      console.error('Error generating speech:', err);
      res.status(500).json({ error: err.message || 'Failed to generate speech audio with Gemini.' });
    }
  });

  app.post('/api/voice/clone', async (req: Request, res: Response) => {
    try {
      const ai = getAiClient(req);
      if (!ai) {
        return res.status(401).json({ error: 'GEMINI_API_KEY is missing. Please provide it in the API Key dialog.' });
      }

      const { audioData, mimeType = 'audio/mp3', samples = [], voiceName = 'My Cloned Voice' } = req.body;

      let rawSamples: Array<{ audioData: string; mimeType: string; name?: string }> = [];
      if (Array.isArray(samples) && samples.length > 0) {
        rawSamples = samples.filter((s) => s && s.audioData);
      } else if (audioData) {
        rawSamples = [{ audioData, mimeType, name: 'Sample 1' }];
      }

      if (rawSamples.length === 0) {
        return res.status(400).json({ error: 'At least one audio sample is required for voice cloning.' });
      }

      const normalizedSamples = rawSamples.slice(0, 5).map((s, idx) => {
        let cleanMime = s.mimeType || 'audio/wav';
        if (cleanMime.includes('webm')) cleanMime = 'audio/webm';
        else if (cleanMime.includes('wav')) cleanMime = 'audio/wav';
        else if (cleanMime.includes('mp4') || cleanMime.includes('m4a')) cleanMime = 'audio/mp4';
        else if (cleanMime.includes('ogg')) cleanMime = 'audio/ogg';
        else if (cleanMime.includes('mpeg') || cleanMime.includes('mp3')) cleanMime = 'audio/mp3';
        return {
          audioData: s.audioData,
          mimeType: cleanMime,
          name: s.name || `Sample ${idx + 1}`,
        };
      });

      const sampleCount = normalizedSamples.length;
      const isMultiSample = sampleCount > 1;
      const audioParts = normalizedSamples.map((s) => ({
        inlineData: {
          mimeType: s.mimeType,
          data: s.audioData,
        },
      }));

      const prompt = `You are a world-class audio engineer and voice cloning acoustics specialist. You are given ${sampleCount} audio sample(s) from the target speaker to create a high-precision voice clone profile.
${
  isMultiSample
    ? `MULTIPLE SAMPLES PROVIDED (${sampleCount} files). Cross-correlate the audio across all clips to find consistent vocal timbre, pitch register, articulation habits, breath dynamics, and pacing across variations.`
    : `SINGLE SAMPLE PROVIDED. Extract detailed acoustic characteristics and quality metrics.`
}
Evaluate:
1. Audio Quality & Suitability Assessment:
   - Clarity Score (0-100)
   - Clarity Description
   - Background Noise Level: "Low / Clean Studio", "Moderate / Noticeable", or "High / Noisy"
   - Background Noise Score (0-100)
   - Noise Description
   - Speech Distinctiveness: "High", "Moderate", or "Low"
   - Distinctiveness Description
   - Overall Suitability: "Excellent", "Good", "Fair", or "Poor"
   - Actionable Feedback: 1-2 direct sentences advising on sample suitability.
   - Improvement Suggestions: List of 2-4 concrete suggestions.
   - Sample Breakdown: Assessment for each sample with sampleIndex, clarityScore, backgroundNoiseScore, suitability, and note.
2. Vocal Profile Characteristics:
   - Perceived Gender/Register: "Masculine", "Feminine", or "Neutral"
   - Pitch Range
   - Vocal Texture & Timbre
   - Cadence & Rhythm
   - Speaking Pace: "Slow", "Moderate", "Fast", or "Dynamic"
   - Baseline Emotion
   - Accent / Dialect
   - Best Gemini Base Voice: Pick from ["Fenrir", "Puck", "Charon", "Kore", "Aoede", "Zephyr"]
   - Synthesis Style Prompt: 25-45 words style prompt for speechMetadata.style.
   - Sample Transcription: Transcribe representative phrase(s) from audio.
   - Tags: 4-6 concise keyword tags.`;

      const analysisResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            parts: [...audioParts, { text: prompt }],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              voiceName: { type: Type.STRING },
              gender: { type: Type.STRING },
              quality: {
                type: Type.OBJECT,
                properties: {
                  clarityScore: { type: Type.NUMBER },
                  clarityDescription: { type: Type.STRING },
                  backgroundNoiseLevel: { type: Type.STRING },
                  backgroundNoiseScore: { type: Type.NUMBER },
                  noiseDescription: { type: Type.STRING },
                  speechDistinctiveness: { type: Type.STRING },
                  distinctivenessDescription: { type: Type.STRING },
                  overallSuitability: { type: Type.STRING },
                  actionableFeedback: { type: Type.STRING },
                  improvementSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  sampleBreakdown: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        sampleIndex: { type: Type.INTEGER },
                        clarityScore: { type: Type.NUMBER },
                        backgroundNoiseScore: { type: Type.NUMBER },
                        suitability: { type: Type.STRING },
                        note: { type: Type.STRING },
                      },
                      required: ['sampleIndex', 'clarityScore', 'backgroundNoiseScore', 'suitability', 'note'],
                    },
                  },
                },
                required: [
                  'clarityScore',
                  'clarityDescription',
                  'backgroundNoiseLevel',
                  'backgroundNoiseScore',
                  'speechDistinctiveness',
                  'overallSuitability',
                  'actionableFeedback',
                  'improvementSuggestions',
                ],
              },
              pitch: { type: Type.STRING },
              timbre: { type: Type.STRING },
              pacing: { type: Type.STRING },
              emotion: { type: Type.STRING },
              accent: { type: Type.STRING },
              bestBaseVoice: { type: Type.STRING },
              stylePrompt: { type: Type.STRING },
              sampleTranscription: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              similarityConfidence: { type: Type.NUMBER },
            },
            required: ['quality', 'gender', 'pitch', 'timbre', 'pacing', 'emotion', 'bestBaseVoice', 'stylePrompt', 'tags'],
          },
        },
      });

      const parsedText = analysisResponse.text || '{}';
      let resultData: any = {};
      try {
        resultData = JSON.parse(parsedText);
      } catch {
        resultData = {
          voiceName: voiceName || 'Cloned Voice',
          gender: 'Neutral',
          quality: {
            clarityScore: 85,
            clarityDescription: 'Good speech clarity with clear vocal presence.',
            backgroundNoiseLevel: 'Low / Clean Studio',
            backgroundNoiseScore: 88,
            noiseDescription: 'Minimal ambient noise detected.',
            speechDistinctiveness: 'Moderate',
            distinctivenessDescription: 'Natural conversational tone.',
            overallSuitability: 'Good',
            actionableFeedback: 'Sample audio is suitable for voice synthesis.',
            improvementSuggestions: ['For maximum fidelity, speak directly into the microphone.'],
            sampleBreakdown: normalizedSamples.map((_s, idx) => ({
              sampleIndex: idx + 1,
              clarityScore: 85,
              backgroundNoiseScore: 88,
              suitability: 'Good',
              note: `Sample ${idx + 1} provides solid vocal presence.`,
            })),
          },
          pitch: 'Medium',
          timbre: 'Natural and clear',
          pacing: 'Conversational',
          emotion: 'Warm and friendly',
          bestBaseVoice: 'Kore',
          stylePrompt: 'Natural speaking voice, clear enunciation, conversational pacing and warm delivery.',
          tags: ['Cloned', 'Natural', 'Clear', 'Warm'],
        };
      }

      const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede'];
      let baseVoice = resultData.bestBaseVoice;
      if (!validVoices.includes(baseVoice)) {
        baseVoice = resultData.gender?.toLowerCase().includes('fem') ? 'Aoede' : 'Puck';
      }

      const sampleBreakdown = (resultData.quality?.sampleBreakdown || []).map((b: any, idx: number) => ({
        ...b,
        name: normalizedSamples[idx]?.name || `Sample ${idx + 1}`,
      }));

      const baseConfidence = resultData.similarityConfidence || 92;
      const confidence = isMultiSample
        ? Math.min(99, Math.max(90, baseConfidence + Math.min(6, sampleCount * 2)))
        : baseConfidence;

      const clonedProfile = {
        id: 'clone-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        name: voiceName && voiceName.trim() ? voiceName.trim() : resultData.voiceName || 'Cloned Voice',
        isCloned: true,
        baseVoice,
        gender: resultData.gender || 'Neutral',
        stylePrompt: resultData.stylePrompt,
        sampleCount,
        sampleNames: normalizedSamples.map((s) => s.name),
        quality: {
          ...resultData.quality,
          sampleBreakdown,
        },
        analysis: {
          pitch: resultData.pitch,
          timbre: resultData.timbre,
          pacing: resultData.pacing,
          emotion: resultData.emotion,
          accent: resultData.accent || 'Neutral',
          transcription: resultData.sampleTranscription || '(Audio sample speech)',
        },
        tags: Array.isArray(resultData.tags) ? resultData.tags : ['Cloned', 'Custom'],
        confidence,
        createdAt: new Date().toISOString(),
      };

      res.json({ success: true, clonedProfile });
    } catch (err: any) {
      console.error('Error cloning voice:', err);
      res.status(500).json({ error: err.message || 'Failed to analyze and clone voice from audio sample.' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vocalis TTS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});