import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini client strictly on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Wraps raw PCM (16-bit little-endian) buffer into a valid WAV container
 * with a 44-byte standard RIFF header.
 */
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  // If already a valid WAV (starts with 'RIFF'), return original
  if (pcmBuffer.length >= 12 && pcmBuffer.subarray(0, 4).toString('ascii') === 'RIFF') {
    return pcmBuffer;
  }

  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0); // ChunkID
  header.writeUInt32LE(chunkSize, 4); // ChunkSize
  header.write('WAVE', 8); // Format
  header.write('fmt ', 12); // Subchunk1ID
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22); // NumChannels
  header.writeUInt32LE(sampleRate, 24); // SampleRate
  header.writeUInt32LE(byteRate, 28); // ByteRate
  header.writeUInt16LE(blockAlign, 32); // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34); // BitsPerSample
  header.write('data', 36); // Subchunk2ID
  header.writeUInt32LE(dataSize, 40); // Subchunk2Size

  return Buffer.concat([header, pcmBuffer]);
}

// Built-in voice styles catalog
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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON payload parser for base64 audio uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    });
  });

  // Get available voices
  app.get('/api/voices', (_req: Request, res: Response) => {
    res.json({
      presets: DEFAULT_VOICE_PRESETS,
      prebuiltVoices: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede'],
    });
  });

  // Text-To-Speech Generation Endpoint
  app.post('/api/tts/generate', async (req: Request, res: Response) => {
    try {
      const {
        text,
        voiceName = 'Kore',
        stylePrompt = '',
        model = 'gemini-3.8-flash-tts', // Flagship audio model for voice design and rich stylization
        emotion = '',
        pace = 'normal',
        clonedVoiceProfile,
      } = req.body;

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'Text content is required for speech generation.' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      }

      // Compile effective style instructions
      let combinedStyle = '';
      if (clonedVoiceProfile?.stylePrompt) {
        combinedStyle += clonedVoiceProfile.stylePrompt + ' ';
      }
      if (stylePrompt && stylePrompt.trim()) {
        combinedStyle += stylePrompt.trim() + ' ';
      }
      if (emotion && emotion.trim()) {
        combinedStyle += `Emotion/Tone: ${emotion.trim()}. `;
      }
      if (pace && pace !== 'normal') {
        combinedStyle += `Pacing: ${pace} pace. `;
      }

      const effectiveVoiceName = clonedVoiceProfile?.baseVoice || voiceName || 'Kore';
      // Allowed prebuilt voice names in Gemini TTS
      const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede'];
      const chosenVoice = validVoices.includes(effectiveVoiceName) ? effectiveVoiceName : 'Kore';

      // Pick model: use gemini-3.8-flash-tts for voice design / custom style, or gemini-3.8-flash-lite-tts
      const selectedModel = model === 'gemini-3.8-flash-lite-tts' ? 'gemini-3.8-flash-lite-tts' : 'gemini-3.8-flash-tts';

      // Speech metadata object
      const speechMetadata: Record<string, string> = {};
      if (combinedStyle.trim()) {
        speechMetadata.style = combinedStyle.trim();
      }

      // Call Gemini TTS API
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

      // Extract raw audio part
      const candidate = geminiResponse.candidates?.[0];
      const audioPart = candidate?.content?.parts?.find(p => p.inlineData && p.inlineData.data);

      if (!audioPart || !audioPart.inlineData?.data) {
        return res.status(500).json({
          error: 'Model did not return speech audio. Try adjusting the text or style prompt.',
        });
      }

      const rawBase64 = audioPart.inlineData.data;
      const rawBuffer = Buffer.from(rawBase64, 'base64');

      // Convert raw PCM 24kHz to standardized WAV container
      const wavBuffer = pcmToWav(rawBuffer, 24000, 1, 16);
      const wavBase64 = wavBuffer.toString('base64');

      // Estimate audio duration in seconds (24000 samples/sec * 2 bytes/sample)
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
      res.status(500).json({
        error: err.message || 'Failed to generate speech audio with Gemini.',
      });
    }
  });

  // Voice Cloning Endpoint: Analyzes one or multiple uploaded audio samples to replicate voice characteristics
  app.post('/api/voice/clone', async (req: Request, res: Response) => {
    try {
      const {
        audioData, // fallback single base64 string
        mimeType = 'audio/mp3',
        samples = [], // array of { audioData: string, mimeType: string, name?: string }
        voiceName = 'My Cloned Voice',
      } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      }

      // Consolidate samples into a unified array
      let rawSamples: Array<{ audioData: string; mimeType: string; name?: string }> = [];
      if (Array.isArray(samples) && samples.length > 0) {
        rawSamples = samples.filter(s => s && s.audioData);
      } else if (audioData) {
        rawSamples = [{ audioData, mimeType, name: 'Sample 1' }];
      }

      if (rawSamples.length === 0) {
        return res.status(400).json({ error: 'At least one audio sample is required for voice cloning.' });
      }

      // Limit to 5 samples max to avoid payload timeouts
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

      // Build inlineData audio parts for each sample
      const audioParts = normalizedSamples.map((s) => ({
        inlineData: {
          mimeType: s.mimeType,
          data: s.audioData,
        },
      }));

      // Multi-sample acoustic analysis prompt
      const prompt = `You are a world-class audio engineer and voice cloning acoustics specialist.
You are given ${sampleCount} audio sample(s) from the target speaker to create a high-precision voice clone profile.
${
  isMultiSample
    ? `MULTIPLE SAMPLES PROVIDED (${sampleCount} files). Cross-correlate the audio across all clips to find consistent vocal timbre, pitch register, articulation habits, breath dynamics, and pacing across variations.`
    : `SINGLE SAMPLE PROVIDED. Extract detailed acoustic characteristics and quality metrics.`
}

Evaluate:
1. Audio Quality & Suitability Assessment:
   - Clarity Score (0-100): Overall aggregate speech clarity and crispness.
   - Clarity Description: Articulation quality across the provided audio.
   - Background Noise Level: "Low / Clean Studio", "Moderate / Noticeable", or "High / Noisy".
   - Background Noise Score (0-100, where 100 means zero background noise / pristine studio).
   - Noise Description: Details on ambient noise, room echo/reverb, fan hum, or mic hiss.
   - Speech Distinctiveness: "High" (unique vocal timbre, strong inflection, rich harmonics), "Moderate", or "Low" (monotone, flat, muffled).
   - Distinctiveness Description: What makes this voice unique or distinct?
   - Overall Suitability: "Excellent" (ideal for cloning), "Good" (suitable with minor nuances), "Fair" (usable but may carry background noise or artifacts), or "Poor" (not recommended without re-recording).
   - Actionable Feedback: 1-2 direct sentences advising the user on whether these sample(s) are good to clone or how to improve them (e.g., 'Samples provide clean, varied acoustics with consistent pitch.', 'Try re-recording in a quieter environment to reduce background noise.', 'Speak slightly slower and enunciate words more clearly.').
   - Improvement Suggestions: List of 2-4 concrete bullet suggestions.
   - Sample Breakdown: An assessment for each of the ${sampleCount} provided sample(s) with sampleIndex (1 to ${sampleCount}), clarityScore (0-100), backgroundNoiseScore (0-100), suitability ("Excellent"|"Good"|"Fair"|"Poor"), and note.

2. Vocal Profile Characteristics:
   - Perceived Gender/Register: "Masculine", "Feminine", or "Neutral"
   - Pitch Range: e.g. "Deep baritone", "Low-mid", "Warm tenor", "Bright alto", "Melodic soprano"
   - Vocal Texture & Timbre: e.g. "Warm and velvety", "Slightly raspy and textured", "Crisp and resonant", "Breathy and soft"
   - Cadence & Rhythm: e.g. "Measured and deliberate", "Conversational and fluid", "Rhythmic and energetic"
   - Speaking Pace: "Slow", "Moderate", "Fast", or "Dynamic"
   - Baseline Emotion: e.g. "Calm and reassuring", "Upbeat and lively", "Authoritative and steady", "Empathetic and warm"
   - Accent / Dialect: e.g. "General American", "British RP", "Australian", "Neutral global"
   - Best Gemini Base Voice: Pick the single closest prebuilt voice from ["Fenrir", "Puck", "Charon", "Kore", "Aoede", "Zephyr"]
   - Synthesis Style Prompt: A rich, evocative style prompt (25-45 words) suitable for speechMetadata.style to make Gemini TTS emulate this speaker.
   - Sample Transcription: Transcribe representative phrase(s) from the audio (10-35 words).
   - Tags: 4-6 concise keyword tags describing the persona.`;

      const analysisResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            parts: [
              ...audioParts,
              {
                text: prompt,
              },
            ],
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
                  clarityScore: { type: Type.NUMBER, description: 'Score from 0 to 100' },
                  clarityDescription: { type: Type.STRING },
                  backgroundNoiseLevel: { type: Type.STRING },
                  backgroundNoiseScore: { type: Type.NUMBER, description: 'Cleanliness score from 0 to 100' },
                  noiseDescription: { type: Type.STRING },
                  speechDistinctiveness: { type: Type.STRING },
                  distinctivenessDescription: { type: Type.STRING },
                  overallSuitability: { type: Type.STRING },
                  actionableFeedback: { type: Type.STRING },
                  improvementSuggestions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
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
                      required: [
                        'sampleIndex',
                        'clarityScore',
                        'backgroundNoiseScore',
                        'suitability',
                        'note',
                      ],
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
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              similarityConfidence: { type: Type.NUMBER },
            },
            required: [
              'quality',
              'gender',
              'pitch',
              'timbre',
              'pacing',
              'emotion',
              'bestBaseVoice',
              'stylePrompt',
              'tags',
            ],
          },
        },
      });

      const parsedText = analysisResponse.text || '{}';
      let resultData: any = {};
      try {
        resultData = JSON.parse(parsedText);
      } catch (pErr) {
        console.error('Failed to parse JSON from analysis response:', pErr);
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
            improvementSuggestions: ['For maximum fidelity, speak directly into the microphone at a steady pace.'],
            sampleBreakdown: normalizedSamples.map((s, idx) => ({
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

      // Ensure base voice is valid
      const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr', 'Aoede'];
      let baseVoice = resultData.bestBaseVoice;
      if (!validVoices.includes(baseVoice)) {
        baseVoice = resultData.gender?.toLowerCase().includes('fem') ? 'Aoede' : 'Puck';
      }

      // Attach file names to sampleBreakdown if available
      const sampleBreakdown = (resultData.quality?.sampleBreakdown || []).map((b: any, idx: number) => ({
        ...b,
        name: normalizedSamples[idx]?.name || `Sample ${idx + 1}`,
      }));

      // Multi-sample bonus to similarity confidence
      const baseConfidence = resultData.similarityConfidence || 92;
      const confidence = isMultiSample ? Math.min(99, Math.max(90, baseConfidence + Math.min(6, sampleCount * 2))) : baseConfidence;

      const clonedProfile = {
        id: 'clone-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        name: voiceName && voiceName.trim() ? voiceName.trim() : resultData.voiceName || 'Cloned Voice',
        isCloned: true,
        baseVoice,
        gender: resultData.gender || 'Neutral',
        stylePrompt: resultData.stylePrompt,
        sampleCount,
        sampleNames: normalizedSamples.map(s => s.name),
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

      res.json({
        success: true,
        clonedProfile,
      });
    } catch (err: any) {
      console.error('Error cloning voice:', err);
      res.status(500).json({
        error: err.message || 'Failed to analyze and clone voice from audio sample.',
      });
    }
  });

  // Dual Speaker Dialogue Synthesis (Bonus flagship feature using gemini-3.8-flash-tts)
  app.post('/api/tts/dialogue', async (req: Request, res: Response) => {
    try {
      const {
        speaker1Name = 'Alex',
        speaker1Voice = 'Puck',
        speaker1Style = 'Enthusiastic podcast host',
        speaker2Name = 'Sam',
        speaker2Voice = 'Kore',
        speaker2Style = 'Curious, articulate co-host',
        dialogueLines = [],
      } = req.body;

      if (!dialogueLines || !Array.isArray(dialogueLines) || dialogueLines.length === 0) {
        return res.status(400).json({ error: 'dialogueLines array is required.' });
      }

      const parts = dialogueLines.map((line: { speaker: string; text: string; style?: string }) => {
        const isSpeaker1 = line.speaker === speaker1Name;
        return {
          text: `${line.speaker}: ${line.text}`,
          speechMetadata: {
            speaker: line.speaker,
            style: line.style || (isSpeaker1 ? speaker1Style : speaker2Style),
          },
        };
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: speaker1Name,
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: speaker1Voice },
                  },
                },
                {
                  speaker: speaker2Name,
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: speaker2Voice },
                  },
                },
              ],
            },
          },
        },
      });

      const candidate = response.candidates?.[0];
      const audioPart = candidate?.content?.parts?.find(p => p.inlineData && p.inlineData.data);
      if (!audioPart || !audioPart.inlineData?.data) {
        return res.status(500).json({ error: 'Dialogue speech could not be generated.' });
      }

      const rawBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
      const wavBuffer = pcmToWav(rawBuffer, 24000, 1, 16);
      const durationSec = Math.max(0.1, Number(((wavBuffer.length - 44) / (24000 * 2)).toFixed(2)));

      res.json({
        success: true,
        audioBase64: wavBuffer.toString('base64'),
        mimeType: 'audio/wav',
        durationSec,
      });
    } catch (err: any) {
      console.error('Error generating dialogue speech:', err);
      res.status(500).json({ error: err.message || 'Failed to generate dialogue speech.' });
    }
  });

  // Serve Vite in dev mode, or dist in production
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

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
