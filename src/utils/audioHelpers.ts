/**
 * Utility functions for audio playback, conversion, and recording.
 */

export function base64ToBlobUrl(base64Data: string, mimeType = 'audio/wav'): string {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function fileToBase64(file: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip off the data:*/*;base64, prefix if present
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

export function downloadAudio(audioUrl: string, filename = 'vocalis-speech.wav') {
  const a = document.createElement('a');
  a.href = audioUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Creates a synthetic speech-like acoustic sample (harmonic human voice formant sweep)
 * encoded as a standard 24kHz mono WAV. Useful as an immediate built-in test sample
 * for users without an external audio file.
 */
export function generateSyntheticVoiceSample(type: 'warm_narrator' | 'fast_podcast' | 'calm_guide'): Promise<Blob> {
  return new Promise((resolve) => {
    const sampleRate = 24000;
    const duration = 4.0; // 4 seconds sample
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Int16Array(numSamples);

    let baseFreq = 120; // Male baritone
    if (type === 'fast_podcast') baseFreq = 165; // Tenor
    if (type === 'calm_guide') baseFreq = 210; // Softer female/neutral

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Formants & syllables envelope
      const syllable = Math.sin(2 * Math.PI * 3.5 * t);
      const envelope = Math.max(0, syllable) * (0.8 + 0.2 * Math.sin(2 * Math.PI * 0.5 * t));
      
      // Pitch inflection variation
      const pitchMod = baseFreq * (1 + 0.08 * Math.sin(2 * Math.PI * 2 * t));
      const f1 = pitchMod;
      const f2 = pitchMod * 2.8;
      const f3 = pitchMod * 5.2;

      // Harmonic synthesis
      const wave =
        0.55 * Math.sin(2 * Math.PI * f1 * t) +
        0.28 * Math.sin(2 * Math.PI * f2 * t) +
        0.17 * Math.sin(2 * Math.PI * f3 * t);

      // Add gentle breathiness
      const breath = (Math.random() * 2 - 1) * 0.03;
      const sampleVal = (wave + breath) * envelope * 0.7;

      // Scale to 16-bit PCM
      buffer[i] = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * 32767)));
    }

    // Wrap in standard 44-byte WAV header
    const wavBytes = new Uint8Array(44 + buffer.byteLength);
    const view = new DataView(wavBytes.buffer);

    function writeString(offset: number, str: string) {
      for (let j = 0; j < str.length; j++) {
        view.setUint8(offset + j, str.charCodeAt(j));
      }
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + buffer.byteLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM
    view.setUint16(20, 1, true); // Format 1 = PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeString(36, 'data');
    view.setUint32(40, buffer.byteLength, true);

    // Copy PCM samples
    const pcmUint8 = new Uint8Array(buffer.buffer);
    wavBytes.set(pcmUint8, 44);

    resolve(new Blob([wavBytes], { type: 'audio/wav' }));
  });
}
