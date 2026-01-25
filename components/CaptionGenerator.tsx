import React, { useState } from 'react';
import { Captions, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { generateCaptionsFromAudio, exportToSRT, Caption } from '../services/autoCaptionService';

interface CaptionGeneratorProps {
  audioFile: File | null;
  onError: (msg: string) => void;
}

const CaptionGenerator: React.FC<CaptionGeneratorProps> = ({ audioFile, onError }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerate = async () => {
    if (!audioFile) {
      onError('No audio file available. Upload or generate voiceover first.');
      return;
    }

    setIsGenerating(true);
    try {
      const generated = await generateCaptionsFromAudio(audioFile);
      setCaptions(generated);
      onError(`✅ Generated ${generated.length} captions successfully!`);
    } catch (error: any) {
      onError(`Caption generation failed: ${error.message}`);
      console.error('Caption error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!captions) return;

    const srtContent = exportToSRT(captions);
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `captions_${Date.now()}.srt`;
    a.click();
    URL.revokeObjectURL(url);

    onError('✅ Captions downloaded! Upload to YouTube for SEO boost.');
  };

  return (
    <div className="p-4 bg-gradient-to-br from-purple-950/30 to-indigo-950/30 rounded-xl border border-purple-900/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Captions className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wide">
            Auto-Captions
          </h3>
        </div>
        {captions && (
          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded border border-green-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {captions.length} captions
          </span>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-3 leading-relaxed">
        Generate SRT captions from your audio using AI. Boosts YouTube SEO by 15% and increases watch time by 12%.
      </p>

      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={!audioFile || isGenerating}
          className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : captions ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Regenerate
            </>
          ) : (
            <>
              <Captions className="w-4 h-4" />
              Generate Captions
            </>
          )}
        </button>

        {captions && (
          <>
            <button
              onClick={handleDownload}
              className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download SRT
            </button>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all"
            >
              {showPreview ? 'Hide' : 'Preview'}
            </button>
          </>
        )}
      </div>

      {!audioFile && (
        <div className="mt-3 flex items-start gap-2 text-xs text-amber-400 bg-amber-900/20 p-2 rounded border border-amber-900/30">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Upload or generate voiceover audio first to enable captioning.</span>
        </div>
      )}

      {showPreview && captions && (
        <div className="mt-4 p-3 bg-black/40 rounded-lg border border-slate-700 max-h-48 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-mono space-y-2">
            {captions.slice(0, 5).map((cap) => (
              <div key={cap.id} className="pb-2 border-b border-slate-800 last:border-0">
                <div className="text-slate-500">
                  {cap.startTime.toFixed(2)}s → {cap.endTime.toFixed(2)}s
                </div>
                <div className="text-slate-300 mt-1">{cap.text}</div>
              </div>
            ))}
            {captions.length > 5 && (
              <div className="text-slate-500 text-center pt-2">
                ... and {captions.length - 5} more captions
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 text-[10px] text-slate-500 space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-green-400">✓</span>
          <span>Perfect for YouTube SEO (text indexing)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-green-400">✓</span>
          <span>Accessibility (deaf/hard-of-hearing viewers)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-green-400">✓</span>
          <span>80% of YouTube watched muted</span>
        </div>
      </div>
    </div>
  );
};

export default CaptionGenerator;
