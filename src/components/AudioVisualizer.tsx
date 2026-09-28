import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Download, Volume2, VolumeX, Sparkles, Check, Copy } from 'lucide-react';
import { formatTime, downloadAudio } from '../utils/audioHelpers';

interface AudioVisualizerProps {
  audioUrl: string | null;
  durationSec?: number;
  voiceName?: string;
  isCloned?: boolean;
  text?: string;
  autoPlay?: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioUrl,
  durationSec = 0,
  voiceName,
  isCloned,
  text,
  autoPlay = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSec);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [copied, setCopied] = useState(false);

  // Audio Context & Analyser for real-time frequency visualizer
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.volume = isMuted ? 0 : volume;
    audio.playbackRate = playbackRate;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || durationSec);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    if (autoPlay) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [audioUrl, autoPlay]);

  // Handle Play/Pause
  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        // Setup analyser if Web Audio Context is available
        if (!audioCtxRef.current && typeof window !== 'undefined') {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            audioCtxRef.current = ctx;
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;
            analyserRef.current = analyser;

            if (audioRef.current) {
              const source = ctx.createMediaElementSource(audioRef.current);
              source.connect(analyser);
              analyser.connect(ctx.destination);
              sourceNodeRef.current = source;
            }
          }
        }
        if (audioCtxRef.current?.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Audio play error:', err);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [0.75, 1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const copyText = () => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Canvas visualizer animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bars = 48;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = (width / bars) - 2;

      let freqData = new Uint8Array(bars);
      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(freqData);
      }

      for (let i = 0; i < bars; i++) {
        let barHeight = 6;
        if (isPlaying) {
          const val = freqData[i] || (Math.sin(Date.now() * 0.005 + i * 0.3) * 0.5 + 0.5) * 80;
          barHeight = Math.max(4, (val / 255) * (height - 8));
        } else {
          // Subtle idle resting wave
          const progress = duration > 0 ? currentTime / duration : 0;
          const isPassed = (i / bars) <= progress;
          barHeight = isPassed ? 10 + Math.sin(i * 0.4) * 6 : 5 + Math.sin(i * 0.4) * 3;
        }

        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        const progressRatio = duration > 0 ? currentTime / duration : 0;
        const isCurrent = (i / bars) <= progressRatio;

        // Gradient coloring
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isCurrent || isPlaying) {
          grad.addColorStop(0, '#818cf8'); // Indigo-400
          grad.addColorStop(1, '#6366f1'); // Indigo-500
        } else {
          grad.addColorStop(0, '#475569'); // Slate-600
          grad.addColorStop(1, '#334155'); // Slate-700
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, currentTime, duration]);

  if (!audioUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 text-neutral-400 text-center">
        <Sparkles className="w-8 h-8 mb-2 text-indigo-400/60 animate-pulse" />
        <p className="text-sm font-medium text-neutral-300">No audio synthesized yet</p>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm">
          Type or select your text above, pick a voice style or cloned voice, and click Generate Speech.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 backdrop-blur-xl p-5 shadow-2xl shadow-indigo-950/20">
      {/* Top Bar with Voice Info & Actions */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-neutral-100 truncate">
                {voiceName || 'Gemini Vocalis'}
              </span>
              {isCloned && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Cloned Voice
                </span>
              )}
            </div>
            <span className="text-xs text-neutral-400">
              Studio Master (24kHz Mono WAV)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {text && (
            <button
              onClick={copyText}
              title="Copy synthesized text"
              className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}

          <button
            onClick={() => downloadAudio(audioUrl, `vocalis-${(voiceName || 'speech').toLowerCase().replace(/\s+/g, '-')}.wav`)}
            title="Download studio-grade WAV file"
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download WAV</span>
          </button>
        </div>
      </div>

      {/* Waveform Visualizer Canvas */}
      <div className="relative w-full h-16 bg-neutral-950/80 rounded-xl border border-neutral-800/80 overflow-hidden mb-3.5 flex items-center justify-center px-3">
        <canvas
          ref={canvasRef}
          width={600}
          height={64}
          className="w-full h-full object-contain pointer-events-none"
        />
        {/* Playhead scrub overlay */}
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          title="Scrub playback position"
        />
      </div>

      {/* Progress & Time */}
      <div className="flex items-center justify-between text-xs text-neutral-400 font-mono mb-3 px-1">
        <span>{formatTime(currentTime)}</span>
        <div className="h-1 flex-1 mx-3 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-75"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Player Control Bar */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-2">
          {/* Main Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {/* Replay 5s */}
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
              }
            }}
            className="p-2.5 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80 transition-all"
            title="Rewind 5s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Speed Switcher */}
          <button
            onClick={cyclePlaybackRate}
            className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/50 transition-all"
            title="Playback speed"
          >
            {playbackRate}x
          </button>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-all"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-18 accent-indigo-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
            title="Volume"
          />
        </div>
      </div>
    </div>
  );
};
