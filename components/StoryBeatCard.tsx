
import React, { useState, useEffect, useRef } from 'react';
import { StoryBeat, ProcessedImage } from '../types';
import { Image as ImageIcon, Wand2, Upload, Loader2, Play, Pause, Video, Sparkles, Clapperboard, Volume2, StopCircle, Clock, ChevronRight, PlayCircle, Rocket } from 'lucide-react';

interface StoryBeatCardProps {
  beat: StoryBeat;
  image?: ProcessedImage;
  audioFile?: File | null;
  onGenerateImage: (beatId: string, prompt: string, useUltra: boolean) => void;
  onGenerateVideo?: (beatId: string, prompt: string) => void;
  onUploadClick: (beatId: string) => void;
  onMotionChange: (beatId: string, motion: 'static' | 'slow_zoom_in' | 'slow_zoom_out' | 'pan_left' | 'pan_right') => void;
  onTimingChange: (beatId: string, start: number, end: number) => void;
  index: number;
}

const StoryBeatCard: React.FC<StoryBeatCardProps> = ({ 
  beat, 
  image, 
  audioFile,
  onGenerateImage,
  onGenerateVideo,
  onUploadClick, 
  onMotionChange,
  onTimingChange,
  index 
}) => {
  const [isPreviewing, setIsPreviewing] = useState(false);
  
  // Refs for media control
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  // Local state for inputs to allow smooth typing
  const [localStart, setLocalStart] = useState(beat.startTime?.toString() || "0");
  const [localEnd, setLocalEnd] = useState(beat.endTime?.toString() || "5");
  const lastCommittedRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // Sync local state with props when they change externally (e.g. from Auto-Distribute)
  useEffect(() => {
    if (beat.startTime !== undefined) setLocalStart(beat.startTime.toFixed(2));
    if (beat.endTime !== undefined) setLocalEnd(beat.endTime.toFixed(2));
  }, [beat.startTime, beat.endTime]);

  const handleTimingBlur = () => {
      const s = parseFloat(localStart);
      const e = parseFloat(localEnd);

      // Prevent duplicate calls with same values
      if (!isNaN(s) && !isNaN(e)) {
          const last = lastCommittedRef.current;
          if (Math.abs(s - last.start) < 0.01 && Math.abs(e - last.end) < 0.01) {
              console.log(`⏭️  Skipping duplicate timing change for ${beat.id}`);
              return;
          }

          console.log(`📤 Committing timing change: ${s.toFixed(2)}s - ${e.toFixed(2)}s`);
          lastCommittedRef.current = { start: s, end: e };
          onTimingChange(beat.id, s, e);
      }
  };

  const getValidTimes = () => {
      const s = parseFloat(localStart);
      const e = parseFloat(localEnd);
      const validStart = !isNaN(s) ? s : (beat.startTime || 0);
      const validEnd = !isNaN(e) ? e : (beat.endTime || validStart + 5);
      return { start: validStart, end: validEnd, duration: Math.max(0.5, validEnd - validStart) };
  };

  const stopPreview = () => {
      setIsPreviewing(false);
      
      // Stop Audio safely
      if (audioRef.current) {
          try {
              audioRef.current.pause();
          } catch(e) { /* ignore */ }
      }
      
      // Stop/Reset Video
      if (videoRef.current) {
          try {
              videoRef.current.pause();
          } catch(e) { /* ignore */ }
      }

      // Clear Timer
      if (stopTimerRef.current) {
          window.clearTimeout(stopTimerRef.current);
          stopTimerRef.current = null;
      }
  };

  const startPreview = () => {
      stopPreview(); // Ensure clean slate
      
      const { start, duration } = getValidTimes();
      setIsPreviewing(true);

      // Play Audio Slice
      if (audioFile) {
          if (!audioRef.current) {
              audioRef.current = new Audio(URL.createObjectURL(audioFile));
          }
          const audio = audioRef.current;
          audio.currentTime = start;
          
          const playPromise = audio.play();
          if (playPromise !== undefined) {
              playPromise.catch(e => {
                  console.error("Audio Play Error:", e);
                  setIsPreviewing(false);
              });
          }
      }

      // Play Video
      if (image?.mediaType === 'video' && videoRef.current) {
          videoRef.current.currentTime = 0;
          const vidPromise = videoRef.current.play();
          if(vidPromise !== undefined) {
              vidPromise.catch(e => console.error("Video Play Error:", e));
          }
      }

      // Schedule Stop
      stopTimerRef.current = window.setTimeout(() => {
          stopPreview();
      }, duration * 1000);
  };

  const togglePreview = () => {
      if (isPreviewing) stopPreview();
      else startPreview();
  };

  // Cleanup on unmount
  useEffect(() => {
      return () => stopPreview();
  }, []);

  return (
    <div className={`flex flex-col md:flex-row gap-4 p-4 rounded-xl transition-all group border ${isPreviewing ? 'bg-indigo-950/20 border-indigo-500/50' : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/60'}`}>
      
      {/* 1. Scene Info */}
      <div className="flex-1 space-y-3 min-w-0">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">SCENE {index + 1}</span>
            </div>
            
            {/* Timing Controls */}
            {audioFile ? (
               <div className="flex items-center gap-0 bg-black/40 rounded border border-slate-700 overflow-hidden">
                  <div className="px-1.5 py-0.5 border-r border-slate-700 bg-slate-800/50">
                     <Clock className="w-3 h-3 text-indigo-400" />
                  </div>
                  <input 
                     type="number" 
                     step="0.1" 
                     className="w-12 bg-transparent text-[10px] font-mono text-white outline-none text-center focus:bg-indigo-500/20 py-1" 
                     value={localStart}
                     onChange={(e) => setLocalStart(e.target.value)}
                     onBlur={handleTimingBlur}
                  />
                  <div className="text-[10px] text-slate-600 font-mono">-</div>
                  <input 
                     type="number" 
                     step="0.1" 
                     className="w-12 bg-transparent text-[10px] font-mono text-white outline-none text-center focus:bg-indigo-500/20 py-1" 
                     value={localEnd}
                     onChange={(e) => setLocalEnd(e.target.value)}
                     onBlur={handleTimingBlur}
                  />
               </div>
            ) : (
                <div className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-slate-400 border border-slate-700">
                    ~{beat.suggested_duration}s
                </div>
            )}
        </div>

        <p className="text-slate-300 text-sm leading-relaxed font-medium line-clamp-2" title={beat.script_text}>
          "{beat.script_text}"
        </p>
        
        <div className="bg-black/30 p-2 rounded border border-slate-800/50">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                <Wand2 className="w-3 h-3" /> Visual Prompt
            </div>
            <p className="text-xs text-slate-400 italic line-clamp-2">
                {beat.visual_prompt}
            </p>
        </div>
      </div>

      {/* 2. Visual Media Slot */}
      <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-2">
         {/* Media Viewport */}
         <div className={`aspect-video bg-black rounded-lg overflow-hidden border relative shadow-lg transition-all duration-300 ${isPreviewing ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-slate-800'}`}>
            {image ? (
                <div className="w-full h-full relative group/media cursor-pointer" onClick={togglePreview}>
                    {image.mediaType === 'video' ? (
                       <video 
                         ref={videoRef}
                         src={image.previewUrl} 
                         className="w-full h-full object-cover"
                         loop
                         muted
                         playsInline
                       />
                    ) : (
                        <img 
                            src={image.previewUrl} 
                            alt="visual" 
                            className={`w-full h-full object-cover transform origin-center will-change-transform ${isPreviewing ? `animate-${beat.motion}` : ''}`} 
                        />
                    )}
                    
                    {/* Play Overlay Icon */}
                    <div className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity ${isPreviewing ? 'opacity-0 hover:opacity-100' : 'opacity-0 group-hover/media:opacity-100'}`}>
                        <div className="w-8 h-8 bg-white/10 backdrop-blur rounded-full flex items-center justify-center border border-white/20 shadow-lg">
                            {isPreviewing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                        </div>
                    </div>
                    
                    {/* Labels */}
                    <div className="absolute top-1.5 left-1.5 flex gap-1 pointer-events-none z-10">
                        {image.mediaType === 'video' ? (
                            <span className="bg-amber-500/90 text-black text-[9px] font-bold px-1 py-px rounded flex items-center gap-0.5 shadow-sm"><Video className="w-2.5 h-2.5"/> VEO</span>
                        ) : (
                            <span className="bg-slate-800/90 text-white text-[9px] font-bold px-1 py-px rounded flex items-center gap-0.5 shadow-sm border border-slate-700"><ImageIcon className="w-2.5 h-2.5"/> IMG</span>
                        )}
                        {image.source === 'generated' && image.mediaType !== 'video' && (
                            image.analysis?.tags?.includes('ultra') ? 
                            <span className="bg-fuchsia-600/90 text-white text-[9px] font-bold px-1 py-px rounded flex items-center gap-0.5 shadow-sm"><Rocket className="w-2.5 h-2.5"/> ULTRA</span>
                            : <span className="bg-purple-600/90 text-white text-[9px] font-bold px-1 py-px rounded flex items-center gap-0.5 shadow-sm"><Sparkles className="w-2.5 h-2.5"/> AI</span>
                        )}
                    </div>
                </div>
            ) : (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 bg-slate-900/50">
                  <ImageIcon className="w-5 h-5 opacity-30 mb-1" />
                  <span className="text-[10px] font-medium opacity-50">Empty</span>
               </div>
            )}

            {/* Loading State */}
            {beat.is_generating_image && (
               <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 z-20 backdrop-blur-sm">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                  <span className="text-[10px] font-mono text-slate-300">GENERATING...</span>
               </div>
            )}
         </div>

         {/* 3. Actions Toolbar */}
         <div className="grid grid-cols-2 gap-1.5">
            {/* Generate Buttons */}
            <div className="col-span-2 flex gap-1">
                 <button 
                    onClick={() => onGenerateImage(beat.id, beat.visual_prompt, false)}
                    disabled={beat.is_generating_image}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors border border-slate-700"
                    title="Generate Fast Image"
                 >
                    <Wand2 className="w-3 h-3" /> Std
                 </button>
                 <button 
                    onClick={() => onGenerateImage(beat.id, beat.visual_prompt, true)}
                    disabled={beat.is_generating_image}
                    className="flex-1 py-1.5 bg-gradient-to-r from-fuchsia-700 to-purple-700 hover:from-fuchsia-600 hover:to-purple-600 disabled:opacity-50 text-white rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                    title="Generate Ultra Quality (Imagen 4)"
                 >
                    <Rocket className="w-3 h-3" /> Pro
                 </button>
                 {onGenerateVideo && (
                    <button
                        onClick={() => onGenerateVideo(beat.id, beat.visual_prompt)}
                        disabled={beat.is_generating_image}
                        className="flex-1 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                        title="Generate AI Image with Cinematic Motion (Ken Burns Effect)"
                    >
                        <Video className="w-3 h-3" /> Motion
                    </button>
                 )}
            </div>

            {/* Upload & Options */}
            <div className="col-span-2 flex gap-1">
                <button 
                    onClick={() => onUploadClick(beat.id)}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors border border-slate-700"
                >
                    <Upload className="w-3 h-3" /> Upload
                </button>
                {image && image.mediaType !== 'video' && (
                    <select 
                        value={beat.motion}
                        onChange={(e) => onMotionChange(beat.id, e.target.value as any)}
                        className="w-16 bg-slate-800 border border-slate-700 text-[10px] text-slate-300 rounded px-1 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                        <option value="static">Static</option>
                        <option value="slow_zoom_in">Zoom In</option>
                        <option value="slow_zoom_out">Zoom Out</option>
                        <option value="pan_left">Pan L</option>
                        <option value="pan_right">Pan R</option>
                    </select>
                )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default StoryBeatCard;
