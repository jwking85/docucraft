
import React, { useState, useRef, useEffect } from 'react';
import { ProcessedImage, StoryBeat, TimelineScene } from '../types';
import { breakdownScript, generateImage, generateDocuVideo, generateVoiceover, alignAudioToScript, enhanceScript } from '../services/geminiService';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../constants';
import StoryBeatCard from './StoryBeatCard';
import VoiceRecorder from './VoiceRecorder';
import VideoTrimmer from './VideoTrimmer';
import { Sparkles, Layout, Loader2, ArrowRight, Mic, Music, Volume2, Info, AlertCircle, RefreshCw, CheckCircle2, RotateCcw, FileText, Radio } from 'lucide-react';

interface StoryWorkspaceProps {
  onComplete: (timeline: TimelineScene[], audioFile: File | null) => void;
  images: ProcessedImage[];
  setImages: React.Dispatch<React.SetStateAction<ProcessedImage[]>>;
  onError: (msg: string) => void;
}

const StoryWorkspace: React.FC<StoryWorkspaceProps> = ({ onComplete, images, setImages, onError }) => {
  const [script, setScript] = useState("");
  const [beats, setBeats] = useState<StoryBeat[]>([]);
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [isEnhancingScript, setIsEnhancingScript] = useState(false);
  
  // Audio State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [audioDisplayDuration, setAudioDisplayDuration] = useState<number>(0);
  const [isSyncingAudio, setIsSyncingAudio] = useState(false);
  const [isAudioSynced, setIsAudioSynced] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [videoToTrim, setVideoToTrim] = useState<File | null>(null);
  const [pendingBeatId, setPendingBeatId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadBeatId, setActiveUploadBeatId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("Export to Timeline");

  // Helper to get audio duration reliably
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(file);
        const audio = new Audio(objectUrl);
        audio.onloadedmetadata = () => {
            resolve(audio.duration);
        };
        audio.onerror = () => {
            console.error("Error loading audio metadata");
            resolve(0);
        };
        setTimeout(() => resolve(0), 5000);
    });
  };

  useEffect(() => {
    if (audioFile) {
        getAudioDuration(audioFile).then(d => {
            setAudioDisplayDuration(d);
            setIsAudioSynced(false); 
            if (beats.length > 0) {
                setBeats(prev => distributeAudioTimings(prev, d));
            }
        });
    } else {
        setAudioDisplayDuration(0);
        setIsAudioSynced(false);
    }
  }, [audioFile]);

  const distributeAudioTimings = (currentBeats: StoryBeat[], totalDuration: number): StoryBeat[] => {
      if (!totalDuration || totalDuration <= 0) return currentBeats;

      const totalChars = currentBeats.reduce((sum, b) => sum + (b.script_text?.length || 0), 0);
      if (totalChars === 0) return currentBeats;

      let durations = currentBeats.map(b => {
          const ratio = (b.script_text?.length || 0) / totalChars;
          return ratio * totalDuration;
      });

      const MIN_DURATION = 1.5;
      if (totalDuration > (currentBeats.length * MIN_DURATION)) {
          let hasChange = true;
          let iterations = 0;
          while(hasChange && iterations < 20) {
              hasChange = false;
              iterations++;
              
              for(let i=0; i<durations.length; i++) {
                  if (durations[i] < MIN_DURATION) {
                      const deficit = MIN_DURATION - durations[i];
                      let maxIdx = -1;
                      let maxVal = -1;
                      for(let j=0; j<durations.length; j++) {
                          if (durations[j] > maxVal && j !== i) {
                              maxVal = durations[j];
                              maxIdx = j;
                          }
                      }
                      if (maxIdx !== -1 && durations[maxIdx] > (MIN_DURATION + deficit + 0.5)) {
                          durations[i] += deficit;
                          durations[maxIdx] -= deficit;
                          hasChange = true;
                      }
                  }
              }
          }
      }

      let cursor = 0.0;
      return currentBeats.map((b, i) => {
          const duration = durations[i];
          const start = Number(cursor.toFixed(2));
          let end = Number((cursor + duration).toFixed(2));
          
          if (i === currentBeats.length - 1) {
              end = Number(totalDuration.toFixed(2));
          }
          
          cursor = end;
          
          return {
              ...b,
              startTime: start,
              endTime: end,
              suggested_duration: Number((end - start).toFixed(2))
          };
      });
  };

  const handleResetTimings = () => {
      if (audioFile && audioDisplayDuration > 0) {
          setBeats(prev => distributeAudioTimings(prev, audioDisplayDuration));
          setIsAudioSynced(false);
      }
  };

  useEffect(() => {
      if (warningMsg) {
          const t = setTimeout(() => setWarningMsg(null), 8000);
          return () => clearTimeout(t);
      }
  }, [warningMsg]);

  const handleError = (e: any, context: string) => {
      console.error(context, e);
      let msg = "An unexpected error occurred.";
      if (e instanceof Error) msg = e.message;
      else if (typeof e === 'string') msg = e;
      else msg = JSON.stringify(e);

      // Provide user-friendly error messages
      if (msg.includes('403') || msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('forbidden')) {
          msg = `${context} Failed: API permission denied. Please verify your Gemini API key has the required permissions.`;
      } else if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
          msg = `${context} Failed: AI model unavailable (404). The model may not be enabled for your API key.`;
      } else if (msg.includes('429') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('quota')) {
          msg = `${context} Failed: Rate limit exceeded. Please wait a moment and try again.`;
      } else if (msg.includes('500') || msg.toLowerCase().includes('internal server')) {
          msg = `${context} Failed: Server error (500). Google's AI service is experiencing issues. Please try again later.`;
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
          msg = `${context} Failed: Network error. Please check your internet connection.`;
      } else if (msg.includes('IMAGEN_UNAVAILABLE')) {
          msg = "Imagen 4 is not enabled. Enable it in Google Cloud Console or use standard quality.";
      } else if (msg.includes('VEO_PAYWALL')) {
          msg = "Veo video generation requires a paid Google Cloud plan. Using image fallback instead.";
      } else {
          msg = `${context} Failed: ${msg}`;
      }
      onError(msg);
  };

  const handleEnhanceScript = async () => {
    if (!script.trim()) return;
    setIsEnhancingScript(true);
    try {
      const enhanced = await enhanceScript(script);
      setScript(enhanced);
    } catch (e) {
      handleError(e, "Enhance Script");
    } finally {
      setIsEnhancingScript(false);
    }
  };

  const handleBreakdown = async () => {
    if (!script.trim()) return;
    setIsBreakingDown(true);
    setBeats([]);
    setIsAudioSynced(false);
    try {
      const newBeats = await breakdownScript(script);
      if (audioFile && audioDisplayDuration > 0) {
          const distributed = distributeAudioTimings(newBeats, audioDisplayDuration);
          setBeats(distributed);
      } else {
          setBeats(newBeats);
      }
    } catch (e) {
      handleError(e, "Script Breakdown");
    } finally {
      setIsBreakingDown(false);
    }
  };

  const handleGenerateVoice = async () => {
    if (!script.trim()) return;
    setIsGeneratingVoice(true);
    try {
        const file = await generateVoiceover(script);
        setAudioFile(file);
    } catch (e) {
        handleError(e, "Voice Generation");
    } finally {
        setIsGeneratingVoice(false);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files?.[0]) {
          const file = e.target.files[0];

          // Validate file size
          if (file.size > MAX_FILE_SIZE_BYTES) {
              setWarningMsg(`Audio file too large! Maximum size is ${MAX_FILE_SIZE_MB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
              return;
          }

          setAudioFile(file);
      }
  };

  const handleRecordingComplete = (file: File) => {
      setAudioFile(file);
      setShowVoiceRecorder(false);
  };

  const handleSmartSync = async () => {
    if (!audioFile || beats.length === 0) return;
    setIsSyncingAudio(true);
    try {
        const segments = beats.map(b => ({ id: b.id, text: b.script_text }));
        const alignment = await alignAudioToScript(audioFile, segments);
        
        let cursor = 0;
        setBeats(prev => {
            return prev.map((b, i) => {
                const align = alignment[b.id];
                let start = cursor;
                let end = cursor + (b.suggested_duration || 5);

                if (align) {
                    start = align.start;
                    end = align.end;
                } else if (i === prev.length - 1 && audioDisplayDuration > 0) {
                    end = audioDisplayDuration; // Snap last to end
                }

                if (Math.abs(start - cursor) > 0.1) {
                    start = cursor; 
                }
                
                cursor = end;
                return { 
                    ...b, 
                    startTime: Number(start.toFixed(2)), 
                    endTime: Number(end.toFixed(2)), 
                    suggested_duration: Number((end - start).toFixed(2)) 
                };
            });
        });
        setIsAudioSynced(true);
    } catch (e) {
        handleError(e, "Audio Sync");
    } finally {
        setIsSyncingAudio(false);
    }
  };

  const handleTimingChange = (beatId: string, newStart: number, newEnd: number) => {
      setBeats(prev => {
          const index = prev.findIndex(b => b.id === beatId);
          if (index === -1) return prev;

          const newBeats = [...prev];
          newBeats[index] = {
              ...newBeats[index],
              startTime: newStart,
              endTime: newEnd,
              suggested_duration: Number((newEnd - newStart).toFixed(2))
          };

          if (index < newBeats.length - 1) {
              const nextBeat = newBeats[index + 1];
              if (newEnd > (nextBeat.startTime || 0)) {
                  newBeats[index + 1] = {
                      ...nextBeat,
                      startTime: newEnd,
                      endTime: Math.max(newEnd + 1, nextBeat.endTime || newEnd + 5) 
                  };
              } 
              else if (newEnd < (nextBeat.startTime || 0)) {
                   newBeats[index + 1] = {
                      ...nextBeat,
                      startTime: newEnd
                  };
              }
          }

          if (index > 0) {
              const prevBeat = newBeats[index - 1];
              if (newStart < (prevBeat.endTime || 0) || newStart > (prevBeat.endTime || 0)) {
                   newBeats[index - 1] = {
                       ...prevBeat,
                       endTime: newStart
                   };
              }
          }

          return newBeats;
      });
  };

  const handleGenerateImage = async (beatId: string, prompt: string, useUltra: boolean = false) => {
    setBeats(prev => prev.map(b => b.id === beatId ? { ...b, is_generating_image: true } : b));
    try {
        const base64Img = await generateImage(prompt, useUltra);
        const newImage: ProcessedImage = {
            id: `gen-${Date.now()}`,
            previewUrl: base64Img,
            source: 'generated',
            mediaType: 'image',
            isAnalyzing: false,
            analysis: {
                filename: useUltra ? `AI_Imagen_${Date.now()}` : `AI_Gen_${Date.now()}`,
                short_caption: useUltra ? "Imagen 4 Ultra" : "Standard Generation",
                detailed_caption: prompt,
                tags: ["ai", "generated", useUltra ? "ultra" : "standard"],
                best_sections: "peak",
                mood: "neutral",
                confidence: 1
            }
        };
        setImages(prev => [...prev, newImage]);
        setBeats(prev => prev.map(b => b.id === beatId ? { ...b, selected_image_id: newImage.id, is_generating_image: false } : b));
    } catch (e: any) {
        if (e.message === "IMAGEN_UNAVAILABLE") {
            setWarningMsg("Imagen 4 (Ultra Quality) is not enabled on this project. Try standard quality.");
        } else {
            handleError(e, "Image Generation");
        }
        setBeats(prev => prev.map(b => b.id === beatId ? { ...b, is_generating_image: false } : b));
    }
  };

  const handleGenerateVideo = async (beatId: string, prompt: string) => {
    setBeats(prev => prev.map(b => b.id === beatId ? { ...b, is_generating_image: true } : b));
    try {
        const videoUrl = await generateDocuVideo(prompt);
        const newImage: ProcessedImage = {
            id: `gen-video-${Date.now()}`,
            previewUrl: videoUrl,
            source: 'generated',
            mediaType: 'video',
            isAnalyzing: false,
            analysis: {
                filename: `AI_Video_${Date.now()}`,
                short_caption: "AI Generated Video",
                detailed_caption: prompt,
                tags: ["ai", "generated", "video", "veo"],
                best_sections: "peak",
                mood: "neutral",
                confidence: 1
            }
        };
        setImages(prev => [...prev, newImage]);
        setBeats(prev => prev.map(b => b.id === beatId ? { ...b, selected_image_id: newImage.id, is_generating_image: false } : b));
    } catch (e: any) {
        if (e.message === "VEO_PAYWALL") {
            setWarningMsg("AI Video generation requires paid API. Using Cinematic Motion Image (Ken Burns effect) instead - Free!");
            try {
                const base64Img = await generateImage(prompt, false);
                const newImage: ProcessedImage = {
                    id: `gen-motion-${Date.now()}`,
                    previewUrl: base64Img,
                    source: 'generated',
                    mediaType: 'image',
                    isAnalyzing: false,
                    analysis: {
                        filename: `AI_Motion_${Date.now()}`,
                        short_caption: "Cinematic Motion Image",
                        detailed_caption: prompt,
                        tags: ["ai", "generated", "motion"],
                        best_sections: "peak",
                        mood: "neutral",
                        confidence: 1
                    }
                };
                setImages(prev => [...prev, newImage]);
                setBeats(prev => prev.map(b => b.id === beatId ? { ...b, selected_image_id: newImage.id, is_generating_image: false, motion: 'slow_zoom_in' } : b));
                return;
            } catch (innerE) {
                handleError(innerE, "Image Fallback Failed");
            }
        } else {
            handleError(e, "Video Generation");
        }
        setBeats(prev => prev.map(b => b.id === beatId ? { ...b, is_generating_image: false } : b));
    }
  };

  const handleUploadClick = (beatId: string) => {
    setActiveUploadBeatId(beatId);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0 && activeUploadBeatId) {
          const file = e.target.files[0];

          // Validate file size
          if (file.size > MAX_FILE_SIZE_BYTES) {
              setWarningMsg(`File too large! Maximum size is ${MAX_FILE_SIZE_MB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
              setActiveUploadBeatId(null);
              return;
          }

          const isVideo = file.type.startsWith('video');

          // If video, open trimmer
          if (isVideo) {
              setVideoToTrim(file);
              setPendingBeatId(activeUploadBeatId);
              setActiveUploadBeatId(null);
              return;
          }

          // If image, add directly
          const newImage: ProcessedImage = {
              id: `up-${Date.now()}`,
              file: file,
              previewUrl: URL.createObjectURL(file),
              source: 'upload',
              mediaType: 'image',
              isAnalyzing: true
          };
          setImages(prev => [...prev, newImage]);
          setBeats(prev => prev.map(b => b.id === activeUploadBeatId ? { ...b, selected_image_id: newImage.id } : b));

          setImages(prev => prev.map(i => i.id === newImage.id ? { ...i, isAnalyzing: false } : i));
      }
      setActiveUploadBeatId(null);
  };

  const handleVideoTrimComplete = (trimmedFile: File, startTime: number, endTime: number) => {
      if (!pendingBeatId) return;

      const newImage: ProcessedImage = {
          id: `up-${Date.now()}`,
          file: trimmedFile,
          previewUrl: URL.createObjectURL(trimmedFile),
          source: 'upload',
          mediaType: 'video',
          isAnalyzing: false
      };

      setImages(prev => [...prev, newImage]);
      setBeats(prev => prev.map(b => b.id === pendingBeatId ? { ...b, selected_image_id: newImage.id } : b));

      // Close trimmer
      setVideoToTrim(null);
      setPendingBeatId(null);
  };

  const handleVideoTrimCancel = () => {
      setVideoToTrim(null);
      setPendingBeatId(null);
  };

  const handleMotionChange = (beatId: string, motion: any) => {
      setBeats(prev => prev.map(b => b.id === beatId ? { ...b, motion } : b));
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus("Building Timeline...");
    try {
        const finalBeats = [...beats];
        
        const timeline: TimelineScene[] = finalBeats.map((beat, i) => {
            const img = images.find(im => im.id === beat.selected_image_id);
            const mediaSource = img ? (img.source === 'generated' ? img.previewUrl : img.file?.name) : '';
            
            let finalDuration = beat.suggested_duration;

            if (beat.startTime !== undefined && beat.endTime !== undefined) {
                 finalDuration = Number((beat.endTime - beat.startTime).toFixed(2));
            } else if (beat.startTime !== undefined) {
                 if (i < finalBeats.length - 1 && finalBeats[i+1].startTime !== undefined) {
                     finalDuration = Number(((finalBeats[i+1].startTime as number) - beat.startTime).toFixed(2));
                 }
            }

            return {
                scene_id: beat.id,
                scene_summary: beat.script_text.substring(0, 30) + "...",
                suggested_duration_seconds: finalDuration,
                selected_images: mediaSource ? [mediaSource] : [],
                motion: beat.motion || 'slow_zoom_in',
                script_excerpt: beat.script_text,
                start_time: beat.startTime?.toString(),
                end_time: beat.endTime?.toString(),
                reasoning: "User defined via Storyboard"
            };
        });
        
        onComplete(timeline, audioFile);
    } catch (e) {
        handleError(e, "Export Preparation");
    } finally {
        setIsExporting(false);
        setExportStatus("Export to Timeline");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
      <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={handleAudioUpload} />

      {/* Video Trimmer Modal */}
      {videoToTrim && (
        <VideoTrimmer
          videoFile={videoToTrim}
          onTrimComplete={handleVideoTrimComplete}
          onCancel={handleVideoTrimCancel}
        />
      )}

      {warningMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
             <div className="bg-amber-950/90 border border-amber-500/50 text-amber-100 px-4 py-2 rounded-lg shadow-2xl flex items-center gap-2 backdrop-blur-md">
                 <AlertCircle className="w-4 h-4 text-amber-400" />
                 <span className="text-xs font-medium">{warningMsg}</span>
             </div>
        </div>
      )}

      {/* Left Panel: Script & Audio */}
      <div className="lg:col-span-4 flex flex-col gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
           <div className="flex items-center gap-2">
               <FileText className="w-4 h-4 text-indigo-400" />
               <h2 className="text-sm font-bold text-white uppercase tracking-wider">Story Script</h2>
           </div>
           <div className="text-[10px] text-slate-500 font-mono">
               {script.length} chars • {script.split(/\s+/).filter(w => w.length > 0).length} words
           </div>
        </div>
        
        <div className="flex-1 flex flex-col min-h-0">
             <textarea
                className="flex-1 bg-black/40 border border-slate-800 rounded-lg p-4 text-slate-300 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:outline-none resize-none font-mono text-xs leading-relaxed mb-4 placeholder:text-slate-600 custom-scrollbar"
                placeholder="Paste your documentary script here..."
                value={script}
                onChange={(e) => setScript(e.target.value)}
             />

            <div className="bg-black/40 rounded-lg p-3 border border-slate-800 space-y-3 mb-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                         <Volume2 className="w-3 h-3" /> Voiceover Track
                     </span>
                     {audioFile && (
                         <button onClick={() => { setAudioFile(null); setAudioDisplayDuration(0); }} className="text-[10px] text-red-400 hover:text-red-300">Remove</button>
                     )}
                </div>
                
                {audioFile ? (
                    <div className="flex items-center gap-3 bg-slate-800/80 p-2 rounded border border-slate-700">
                        <div className="w-8 h-8 bg-green-500/10 rounded flex items-center justify-center text-green-400 border border-green-500/20">
                            <Music className="w-4 h-4" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="text-xs font-medium text-white truncate">{audioFile.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{audioDisplayDuration > 0 ? `${audioDisplayDuration.toFixed(1)}s` : 'Analyzing...'}</div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                               onClick={handleGenerateVoice}
                               disabled={!script.trim() || isGeneratingVoice}
                               className="py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-xs font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {isGeneratingVoice ? <Loader2 className="w-3 h-3 animate-spin"/> : <Mic className="w-3 h-3 text-purple-400" />}
                                AI TTS
                            </button>
                            <button
                               onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                               className={`py-2 border rounded text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                                   showVoiceRecorder
                                       ? 'bg-red-600/20 border-red-500/50 text-red-300'
                                       : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                               }`}
                            >
                                <Radio className="w-3 h-3 text-red-400" />
                                Record
                            </button>
                            <button
                               onClick={() => audioInputRef.current?.click()}
                               className="py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-xs font-medium flex items-center justify-center gap-2 transition-all"
                            >
                                <Music className="w-3 h-3 text-blue-400" />
                                Upload
                            </button>
                        </div>

                        {showVoiceRecorder && (
                            <div className="mt-3">
                                <VoiceRecorder
                                    onRecordingComplete={handleRecordingComplete}
                                    onError={(msg) => setWarningMsg(msg)}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            <button
               onClick={handleEnhanceScript}
               disabled={!script.trim() || isEnhancingScript}
               className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 flex-shrink-0"
               title="Use AI to add historical context and improve factual accuracy"
            >
               {isEnhancingScript ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
               Enhance Script (AI)
            </button>

            <button
               onClick={handleBreakdown}
               disabled={!script.trim() || isBreakingDown}
               className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 transition-all disabled:opacity-50 flex-shrink-0"
            >
               {isBreakingDown ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
               Analyze & Visualize
            </button>
        </div>
      </div>

      {/* Right Panel: Storyboard */}
      <div className="lg:col-span-8 flex flex-col gap-4 h-full overflow-hidden">
         <div className="flex items-center justify-between flex-shrink-0 bg-slate-900/60 p-3 rounded-xl border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Visual Storyboard</h2>
                <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-slate-700">{beats.length} Scenes</span>
            </div>
            <div className="flex items-center gap-2">
               {beats.length > 0 && audioFile && (
                   <>
                       <button 
                          onClick={handleResetTimings}
                          className="text-[10px] px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                          title="Recalculate Default Timings"
                       >
                           <RotateCcw className="w-3 h-3" /> Auto-Fit
                       </button>
                       <button 
                          onClick={handleSmartSync}
                          disabled={isSyncingAudio}
                          className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1 transition-all ${isAudioSynced 
                              ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                              : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-500 shadow-lg shadow-indigo-900/30'}`}
                       >
                           {isSyncingAudio ? <Loader2 className="w-3 h-3 animate-spin" /> : (isAudioSynced ? <CheckCircle2 className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />)}
                           {isSyncingAudio ? 'Syncing...' : (isAudioSynced ? 'Audio Synced' : 'Sync to Audio')}
                       </button>
                   </>
               )}
            </div>
         </div>

         <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 min-h-0 pb-4">
            {beats.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20 p-8 text-center">
                  <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                      <Layout className="w-8 h-8 opacity-20 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-300 mb-1">Storyboard Empty</h3>
                  <p className="text-xs max-w-xs mx-auto mb-6 text-slate-500">Add a script and click Analyze to generate scenes.</p>
               </div>
            ) : (
               beats.map((beat, idx) => {
                  const img = images.find(i => i.id === beat.selected_image_id);
                  return (
                     <StoryBeatCard 
                        key={beat.id} 
                        index={idx}
                        beat={beat} 
                        image={img}
                        audioFile={audioFile}
                        onGenerateImage={handleGenerateImage}
                        onGenerateVideo={handleGenerateVideo}
                        onUploadClick={handleUploadClick}
                        onMotionChange={handleMotionChange}
                        onTimingChange={handleTimingChange}
                     />
                  );
               })
            )}
         </div>

         {beats.length > 0 && (
             <div className="flex justify-end pt-2 flex-shrink-0">
                <button 
                   onClick={handleExport}
                   disabled={isExporting}
                   className="px-6 py-2.5 bg-white hover:bg-slate-200 text-black font-bold rounded-lg flex items-center gap-2 shadow-lg transition-transform disabled:opacity-70 text-sm"
                >
                   {isExporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <ArrowRight className="w-4 h-4" />}
                   {exportStatus}
                </button>
             </div>
         )}
      </div>
    </div>
  );
};

export default StoryWorkspace;
