import React, { useState } from 'react';
import { Film, Check, AlertTriangle, TrendingUp } from 'lucide-react';
import { EXPORT_PRESETS, ExportPreset, validateDuration } from '../services/exportPresets';

interface ExportPresetSelectorProps {
  currentPreset: string;
  videoDuration: number;
  onPresetChange: (presetId: string) => void;
}

const ExportPresetSelector: React.FC<ExportPresetSelectorProps> = ({
  currentPreset,
  videoDuration,
  onPresetChange
}) => {
  const [showAll, setShowAll] = useState(false);

  const selectedPreset = EXPORT_PRESETS.find(p => p.id === currentPreset);
  const validation = selectedPreset ? validateDuration(selectedPreset, videoDuration) : { valid: true };

  // Group presets by platform
  const grouped = EXPORT_PRESETS.reduce((acc, preset) => {
    if (!acc[preset.platform]) acc[preset.platform] = [];
    acc[preset.platform].push(preset);
    return acc;
  }, {} as Record<string, ExportPreset[]>);

  const popularPresets = EXPORT_PRESETS.filter(p =>
    ['youtube-1080p', 'youtube-shorts', 'tiktok', 'instagram-reel'].includes(p.id)
  );

  const presetsToShow = showAll ? EXPORT_PRESETS : popularPresets;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold text-slate-200">Export Platform</h3>
        </div>
        {!validation.valid && (
          <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded border border-red-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Duration issue
          </span>
        )}
      </div>

      {!validation.valid && (
        <div className="bg-red-950/30 border border-red-900/30 rounded-lg p-3 text-xs text-red-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">⚠️ Platform Limit Exceeded</div>
              <div className="text-red-400">{validation.message}</div>
              <div className="mt-2 text-[10px] text-slate-400">
                Trim your video or choose a different platform with higher limits.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {presetsToShow.map((preset) => {
          const isSelected = preset.id === currentPreset;
          const isValid = !preset.maxDuration || videoDuration <= preset.maxDuration;

          return (
            <button
              key={preset.id}
              onClick={() => onPresetChange(preset.id)}
              disabled={!isValid}
              className={`relative p-3 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/50'
                  : isValid
                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                  : 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'
              }`}
              title={preset.description}
            >
              {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
              )}

              <div className="text-2xl mb-1">{preset.icon}</div>
              <div className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                {preset.name}
              </div>
              <div className={`text-[10px] mt-1 ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                {preset.width}×{preset.height}
              </div>
              {!isValid && preset.maxDuration && (
                <div className="absolute inset-0 bg-red-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-[10px] text-red-400 font-bold">Too long</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setShowAll(!showAll)}
        className="w-full text-xs text-slate-400 hover:text-white transition-colors py-2 border border-dashed border-slate-700 hover:border-slate-600 rounded"
      >
        {showAll ? '← Show Popular Only' : `+ Show All ${EXPORT_PRESETS.length} Platforms`}
      </button>

      {selectedPreset && (
        <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
          <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-green-400" />
            Platform Tips:
          </div>
          <ul className="space-y-1.5 text-[10px] text-slate-400">
            {selectedPreset.recommendations.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-green-400 flex-shrink-0">→</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-[10px]">
            <div>
              <div className="text-slate-500">Resolution</div>
              <div className="text-slate-300 font-mono">{selectedPreset.width}×{selectedPreset.height}</div>
            </div>
            <div>
              <div className="text-slate-500">Aspect Ratio</div>
              <div className="text-slate-300 font-mono">{selectedPreset.aspectRatio}</div>
            </div>
            <div>
              <div className="text-slate-500">FPS</div>
              <div className="text-slate-300 font-mono">{selectedPreset.fps}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportPresetSelector;
