import React, { useState, useRef } from 'react';
import { Music, Upload, Volume2, VolumeX, Check, X, Info } from 'lucide-react';

export interface BackgroundMusicConfig {
  file: File;
  volume: number; // 0-1
  autoDuck: boolean;
  duckingAmount: number; // How much to reduce volume during narration (0-1)
  fadeIn: number; // Fade in duration in seconds
  fadeOut: number; // Fade out duration in seconds
}

interface BackgroundMusicSelectorProps {
  onMusicSelected: (config: BackgroundMusicConfig | null) => void;
  currentConfig: BackgroundMusicConfig | null;
}

const BackgroundMusicSelector: React.FC<BackgroundMusicSelectorProps> = ({
  onMusicSelected,
  currentConfig
}) => {
  const [musicFile, setMusicFile] = useState<File | null>(currentConfig?.file || null);
  const [volume, setVolume] = useState(currentConfig?.volume || 0.15);
  const [autoDuck, setAutoDuck] = useState(currentConfig?.autoDuck ?? true);
  const [duckingAmount, setDuckingAmount] = useState(currentConfig?.duckingAmount || 0.7);
  const [fadeIn, setFadeIn] = useState(currentConfig?.fadeIn || 2);
  const [fadeOut, setFadeOut] = useState(currentConfig?.fadeOut || 3);
  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate audio file
    if (!file.type.startsWith('audio/')) {
      alert('Please select a valid audio file');
      return;
    }

    setMusicFile(file);
  };

  const handleApply = () => {
    if (!musicFile) return;

    const config: BackgroundMusicConfig = {
      file: musicFile,
      volume,
      autoDuck,
      duckingAmount,
      fadeIn,
      fadeOut
    };

    onMusicSelected(config);
  };

  const handleRemove = () => {
    setMusicFile(null);
    onMusicSelected(null);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePreview = () => {
    if (!musicFile) return;

    if (isPlaying && audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }

      const audio = new Audio(URL.createObjectURL(musicFile));
      audio.volume = volume;
      audioPreviewRef.current = audio;

      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="p-4 bg-gradient-to-br from-indigo-950/40 to-purple-950/40 rounded-xl border border-indigo-800/40">
      <div className="flex items-center gap-2 mb-4">
        <Music className="w-5 h-5 text-indigo-400" />
        <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wide">
          Background Music
        </h3>
      </div>

      {!musicFile ? (
        <div className="space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload Music Track
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="p-3 bg-blue-950/30 rounded-lg border border-blue-900/40">
            <p className="text-xs text-blue-300 font-medium mb-2">💡 Music Tips:</p>
            <ul className="text-[10px] text-slate-400 space-y-1">
              <li>• Use royalty-free music (YouTube Audio Library, Epidemic Sound)</li>
              <li>• Keep volume low (10-20%) for background ambiance</li>
              <li>• Auto-ducking reduces music during narration</li>
              <li>• Match mood to your documentary type</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current Track */}
          <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
            <div className="w-10 h-10 bg-indigo-500/10 rounded flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Music className="w-5 h-5" />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-medium text-white truncate">{musicFile.name}</div>
              <div className="text-[10px] text-slate-500">{(musicFile.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button
              onClick={togglePreview}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-all"
            >
              {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleRemove}
              className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs font-medium transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
            <label className="text-xs text-slate-300 font-medium mb-2 block">
              Music Volume: {Math.round(volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => {
                const newVolume = parseFloat(e.target.value);
                setVolume(newVolume);
                if (audioPreviewRef.current) {
                  audioPreviewRef.current.volume = newVolume;
                }
              }}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Silent</span>
              <span className="text-indigo-400 font-medium">Recommended: 10-20%</span>
              <span>Loud</span>
            </div>
          </div>

          {/* Auto-Ducking */}
          <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-300 font-medium flex items-center gap-2">
                Auto-Ducking
                <div className="group relative">
                  <Info className="w-3 h-3 text-slate-500 cursor-help" />
                  <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-900 border border-slate-700 rounded text-[10px] text-slate-400 z-10">
                    Automatically lowers music volume when narration is playing
                  </div>
                </div>
              </label>
              <button
                onClick={() => setAutoDuck(!autoDuck)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  autoDuck
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {autoDuck ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              </button>
            </div>

            {autoDuck && (
              <div className="mt-3">
                <label className="text-xs text-slate-400 mb-2 block">
                  Ducking Amount: {Math.round(duckingAmount * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={duckingAmount}
                  onChange={(e) => setDuckingAmount(parseFloat(e.target.value))}
                  className="w-full accent-green-500"
                />
                <div className="text-[10px] text-slate-500 mt-1">
                  Music will be reduced to {Math.round((1 - duckingAmount) * volume * 100)}% during narration
                </div>
              </div>
            )}
          </div>

          {/* Fade In/Out */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
              <label className="text-xs text-slate-400 mb-2 block">
                Fade In: {fadeIn}s
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={fadeIn}
                onChange={(e) => setFadeIn(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
              <label className="text-xs text-slate-400 mb-2 block">
                Fade Out: {fadeOut}s
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={fadeOut}
                onChange={(e) => setFadeOut(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>

          {/* Apply Button */}
          <button
            onClick={handleApply}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-green-500/30 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Apply Background Music
          </button>

          <div className="p-3 bg-green-950/30 rounded-lg border border-green-900/40">
            <p className="text-xs text-green-300 font-medium mb-2">✅ Current Settings:</p>
            <ul className="text-[10px] text-slate-400 space-y-1">
              <li>• Volume: {Math.round(volume * 100)}%</li>
              <li>• Auto-Ducking: {autoDuck ? `ON (${Math.round(duckingAmount * 100)}% reduction)` : 'OFF'}</li>
              <li>• Fade In: {fadeIn}s / Fade Out: {fadeOut}s</li>
              <li>• Loop: Music repeats throughout video</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackgroundMusicSelector;
