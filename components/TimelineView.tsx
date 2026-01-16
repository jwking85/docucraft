
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TimelineScene, ProcessedImage, ScriptType } from '../types';
import { Play, Pause, RotateCcw, Film, Loader2, Volume2, VolumeX, Edit, X, Captions, Tv, Activity, Plus, Save, Music, Palette, Type, ArrowUp, ArrowDown, Trash2, Wand2, AlertTriangle, GripVertical, Clock } from 'lucide-react';
import { editImageAI } from '../services/geminiService';

interface TimelineViewProps {
  timeline: TimelineScene[];
  onUpdateTimeline: (newTimeline: TimelineScene[]) => void;
  images: ProcessedImage[];
  onReset: () => void;
  audioFile: File | null;
  scriptContent: string;
  scriptType: ScriptType;
  onError: (msg: string) => void;
}

interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
}

const parseTime = (timeStr: string | undefined, defaultDur: number): number => {
  if (!timeStr) return defaultDur;
  if (timeStr.includes(':')) {
     const parts = timeStr.split(':');
     if (parts.length === 3) {
         const [h, m, s_ms] = parts;
         let s = s_ms;
         let ms = "0";
         if (s_ms.includes(',')) [s, ms] = s_ms.split(',');
         else if (s_ms.includes('.')) [s, ms] = s_ms.split('.');
         return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + (parseInt(ms) / 1000);
     } else if (parts.length === 2) {
         const [m, s_ms] = parts;
         let s = s_ms;
         let ms = "0";
         if (s_ms.includes(',')) [s, ms] = s_ms.split(',');
         else if (s_ms.includes('.')) [s, ms] = s_ms.split('.');
         return parseInt(m) * 60 + parseInt(s) + (parseInt(ms) / 1000);
     }
  } else if (timeStr.toLowerCase().endsWith('s')) {
      return parseFloat(timeStr);
  } else if (!isNaN(parseFloat(timeStr))) {
      return parseFloat(timeStr);
  }
  return defaultDur;
};

const parseSRT = (content: string): Subtitle[] => {
  const subtitles: Subtitle[] = [];
  const blocks = content.trim().split(/\n\s*\n/);
  blocks.forEach(block => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const timeLine = lines[1].includes('-->') ? lines[1] : lines[0].includes('-->') ? lines[0] : null;
      if (timeLine) {
        const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
        const start = parseTime(startStr, 0);
        const end = parseTime(endStr, 0);
        const text = lines.slice(lines.indexOf(timeLine) + 1).join(' ').replace(/<[^>]*>/g, '');
        subtitles.push({ startTime: start, endTime: end, text });
      }
    }
  });
  return subtitles;
};

const TimelineView: React.FC<TimelineViewProps> = ({ timeline, onUpdateTimeline, images, onReset, audioFile, scriptContent, scriptType, onError }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const [bgmFile, setBgmFile] = useState<File | null>(null);
  
  // Hidden container for offscreen videos (Prevents browser throttling)
  const hiddenMediaContainerRef = useRef<HTMLDivElement>(null);

  // Visualizer Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const isRenderingRef = useRef(false); // Ref to track rendering state in async loops

  const [renderProgress, setRenderProgress] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [editingSceneId, setEditingSceneId] = useState<string | number | null>(null);
  const [exportQuality, setExportQuality] = useState<'1080p' | '720p' | '4K' | 'vertical'>('1080p');

  // Drag and Drop
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Toggles
  const [showCaptions, setShowCaptions] = useState(true);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(true);

  // Cache for generated assets
  const mediaCache = useRef<Map<string, HTMLImageElement | HTMLVideoElement>>(new Map());
  const subtitles = useRef<Subtitle[]>([]);

  // Cleanup rendering state on unmount
  useEffect(() => {
    return () => {
      isRenderingRef.current = false;
    };
  }, []);

  // Parse Subtitles
  useEffect(() => {
    if (scriptType === ScriptType.SRT && scriptContent) {
      subtitles.current = parseSRT(scriptContent);
    } else {
        subtitles.current = [];
    }
  }, [scriptContent, scriptType]);

  // Init Audio for Preview
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      const audio = new Audio(url);
      audio.preload = 'auto';
      audioRef.current = audio;
    }
    if (bgmFile) {
      const url = URL.createObjectURL(bgmFile);
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = 0.15; 
      audio.loop = true;
      bgmRef.current = audio;
    } else {
      if (bgmRef.current) bgmRef.current.pause();
      bgmRef.current = null;
    }

    try {
        if (!audioContextRef.current && (audioRef.current || bgmRef.current)) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContext();
            audioContextRef.current = ctx;
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64; 
            analyserRef.current = analyser;
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
            if (audioRef.current) {
                 const source = ctx.createMediaElementSource(audioRef.current);
                 source.connect(analyser);
                 analyser.connect(ctx.destination);
            }
        }
    } catch(e) { console.warn("Audio Context Init", e); }
  }, [audioFile, bgmFile]);

  // Sync Audio when NOT playing (Scrubbing)
  useEffect(() => {
    if (!isPlaying && !isRendering && audioRef.current) {
        if (Math.abs(audioRef.current.currentTime - currentTime) > 0.1) {
            audioRef.current.currentTime = currentTime;
        }
    }
    if (!isPlaying && !isRendering && bgmRef.current) {
        if (currentTime === 0) bgmRef.current.currentTime = 0;
    }
  }, [currentTime, isPlaying, isRendering]);

  // Normalize Timeline
  const normalizedTimeline = React.useMemo(() => {
    let cursor = 0;
    return timeline.map(scene => {
      let duration = scene.suggested_duration_seconds || 5;
      if (scene.start_time && scene.end_time) {
        const start = parseTime(scene.start_time, 0);
        const end = parseTime(scene.end_time, 0);
        if (end > start) duration = end - start;
      }
      const sceneObj = { ...scene, startTimeSec: cursor, durationSec: duration, endTimeSec: cursor + duration };
      cursor += duration;
      return sceneObj;
    });
  }, [timeline]);

  useEffect(() => {
    if (normalizedTimeline.length > 0) {
      setTotalDuration(normalizedTimeline[normalizedTimeline.length - 1].endTimeSec);
    }
  }, [normalizedTimeline]);

  // Preload Images AND Videos
  useEffect(() => {
    normalizedTimeline.forEach(scene => {
      scene.selected_images.forEach(imgName => {
        if (imgName && !mediaCache.current.has(imgName)) {
           const isGenerated = imgName.startsWith('data:image') || imgName.startsWith('blob:');
           let src = imgName;
           let type: 'image' | 'video' = 'image';

           if (!isGenerated) {
                const found = images.find(img => img.file?.name === imgName || (img.file?.name && img.file.name.includes(imgName)));
                if (found) {
                    src = found.previewUrl;
                    if (found.mediaType === 'video') type = 'video';
                }
           } else {
               const found = images.find(img => img.previewUrl === imgName);
               if (found && found.mediaType === 'video') type = 'video';
           }

           if (type === 'video') {
               const v = document.createElement('video');
               v.src = src;
               v.muted = true;
               v.preload = 'auto';
               v.playsInline = true;
               // v.loop = true; // Loop is handled in render logic logic now
               v.crossOrigin = 'anonymous'; // Good practice for export
               v.load();
               
               // CRITICAL FIX: Append to hidden DOM to prevent browser background throttling
               if (hiddenMediaContainerRef.current) {
                   // Clear previous if any? No, keep cache.
                   v.style.width = '1px';
                   v.style.height = '1px';
                   v.style.opacity = '0.01';
                   hiddenMediaContainerRef.current.appendChild(v);
               }
               
               mediaCache.current.set(imgName, v);
           } else {
               const img = new Image();
               img.crossOrigin = 'anonymous';
               img.src = src;
               mediaCache.current.set(imgName, img);
           }
        }
      });
    });
  }, [normalizedTimeline, images]);

  // --- DRAWING LOGIC ---
  const drawScene = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    
    if (normalizedTimeline.length === 0) {
        ctx.fillStyle = '#1e293b';
        ctx.font = '30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No Timeline Data', w/2, h/2);
        return;
    }

    const currentSceneIndex = normalizedTimeline.findIndex(s => time >= s.startTimeSec && time < s.endTimeSec);
    let currentScene = normalizedTimeline[currentSceneIndex];
    if (!currentScene && normalizedTimeline.length > 0) {
       if (time >= normalizedTimeline[normalizedTimeline.length-1].endTimeSec) {
           // black screen at end
       } else {
           currentScene = normalizedTimeline[0];
       }
    }

    if (currentScene) {
        ctx.save();
        if (currentScene.filter) {
            switch(currentScene.filter) {
                case 'cinematic': ctx.filter = 'contrast(1.2) saturate(1.2)'; break;
                case 'noir': ctx.filter = 'grayscale(1) contrast(1.2)'; break;
                case 'vintage': ctx.filter = 'sepia(0.6) contrast(0.9)'; break;
                case 'muted': ctx.filter = 'saturate(0.5) brightness(0.9)'; break;
                default: ctx.filter = 'none';
            }
        }

        const transitionDuration = 1.0; 
        const timeRemaining = currentScene.endTimeSec - time;
        const nextScene = normalizedTimeline[currentSceneIndex + 1];

        if (timeRemaining < transitionDuration && nextScene) {
           const transitionProgress = 1 - (timeRemaining / transitionDuration); 
           renderLayer(ctx, currentScene, time, 1.0); 
           renderLayer(ctx, nextScene, time, transitionProgress); 
        } else {
           renderLayer(ctx, currentScene, time, 1.0);
        }
        ctx.restore();

        if (currentScene.overlay_text) {
             ctx.save();
             ctx.fillStyle = 'rgba(0,0,0,0.5)';
             ctx.fillRect(0, h * 0.75, w, h * 0.15); 
             ctx.font = 'bold 48px "Inter", sans-serif';
             ctx.fillStyle = 'white';
             ctx.textAlign = 'left';
             ctx.textBaseline = 'middle';
             ctx.fillText(currentScene.overlay_text, 100, h * 0.825);
             ctx.restore();
        }
    }

    if (cinemaMode) {
        const barHeight = h * 0.1;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, w, barHeight);
        ctx.fillRect(0, h - barHeight, w, barHeight);
    }

    if (showVisualizer && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const bufferLength = analyserRef.current.frequencyBinCount;
        const barWidth = (w / bufferLength) * 2.5;
        let x = 0;
        ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'; 
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArrayRef.current[i] / 255) * (h * 0.15);
            const bottomY = cinemaMode ? h * 0.9 : h;
            ctx.fillRect(x, bottomY - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    if (showCaptions && subtitles.current.length > 0) {
        const activeSub = subtitles.current.find(s => time >= s.startTime && time < s.endTime);
        if (activeSub) {
            ctx.font = 'bold 32px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const textY = cinemaMode ? h * 0.85 : h * 0.92;
            ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.strokeText(activeSub.text, w/2, textY);
            ctx.fillStyle = '#fbbf24'; 
            ctx.fillText(activeSub.text, w/2, textY);
        }
    }
  }, [normalizedTimeline, cinemaMode, showCaptions, showVisualizer]);

  const renderLayer = (ctx: CanvasRenderingContext2D, scene: any, time: number, alpha: number) => {
    const imageCount = scene.selected_images.length;
    if (imageCount === 0) return;
    const localTime = Math.max(0, time - scene.startTimeSec);
    const segmentDuration = scene.durationSec / imageCount;
    let imageIndex = Math.floor(localTime / segmentDuration);
    if (imageIndex >= imageCount) imageIndex = imageCount - 1;
    const imgName = scene.selected_images[imageIndex];
    
    const media = mediaCache.current.get(imgName);
    if (!media) return;

    if (media instanceof HTMLVideoElement) {
        const videoDuration = media.duration || 10;
        const videoTime = localTime % videoDuration;
        
        // --- VIDEO SYNC ---
        // During export, we rely on the loop's continuous play.
        // During preview (isPlaying), we keep it synced.
        if (isPlaying || isRendering) {
             if (media.paused) media.play().catch(() => {});
             // Only force seek if drift is significant (prevents stutter)
             if (Math.abs(media.currentTime - videoTime) > 0.3) {
                 media.currentTime = videoTime;
             }
        } else {
             // Static scrubbing
             media.currentTime = videoTime;
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        
        const w = ctx.canvas.width; const h = ctx.canvas.height;
        const vidRatio = (media.videoWidth || 16) / (media.videoHeight || 9);
        const canvasRatio = w / h;
        let drawW, drawH, offsetX, offsetY;
        if (vidRatio > canvasRatio) {
            drawH = h; drawW = h * vidRatio; offsetX = (w - drawW) / 2; offsetY = 0;
        } else {
            drawW = w; drawH = w / vidRatio; offsetX = 0; offsetY = (h - drawH) / 2;
        }
        ctx.drawImage(media, offsetX, offsetY, drawW, drawH);
        ctx.restore();
        return;
    }

    const img = media as HTMLImageElement;
    const segmentProgress = (localTime - (imageIndex * segmentDuration)) / segmentDuration;
    const smoothProgress = -(Math.cos(Math.PI * segmentProgress) - 1) / 2;

    let scale = 1.0; let tx = 0; const baseScale = 1.05; 
    switch (scene.motion) {
      case 'slow_zoom_in': scale = baseScale + (smoothProgress * 0.15); break;
      case 'slow_zoom_out': scale = (baseScale + 0.15) - (smoothProgress * 0.15); break;
      case 'pan_left': scale = baseScale + 0.1; tx = (smoothProgress * 100); break;
      case 'pan_right': scale = baseScale + 0.1; tx = -100 + (smoothProgress * 100); break;
      default: scale = baseScale;
    }

    const w = ctx.canvas.width; const h = ctx.canvas.height;
    const imgRatio = img.width / img.height; const canvasRatio = w / h;
    let drawW, drawH, offsetX, offsetY;
    if (imgRatio > canvasRatio) {
      drawH = h; drawW = h * imgRatio; offsetX = (w - drawW) / 2; offsetY = 0;
    } else {
      drawW = w; drawH = w / imgRatio; offsetX = 0; offsetY = (h - drawH) / 2;
    }

    ctx.save(); ctx.globalAlpha = alpha;
    ctx.translate(w/2, h/2); ctx.scale(scale, scale); ctx.translate(-w/2 + tx, -h/2);
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    ctx.restore();
  };

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      const audio = audioRef.current;
      let playTime = currentTime;
      
      // PREVIEW MODE (Real-time)
      if (isPlaying && !isRendering) {
          if (audio && !audio.paused && !audio.ended && audio.currentTime > 0) {
              playTime = audio.currentTime;
              setCurrentTime(playTime);
          } else {
              const now = performance.now();
              const delta = (now - lastTime) / 1000;
              lastTime = now;
              playTime = currentTime + delta;
              setCurrentTime(playTime);
          }
          
          if (playTime >= totalDuration) {
              setIsPlaying(false);
              playTime = totalDuration;
          }
          
          if (canvasRef.current?.getContext('2d')) {
              drawScene(canvasRef.current.getContext('2d')!, playTime);
          }
          
          if(isPlaying) animationFrameId = requestAnimationFrame(animate);
      } 
      // RENDERING MODE IS HANDLED IN TICK LOOP
    };

    if (isPlaying && !isRendering) {
      if (audioRef.current) {
          if(Math.abs(audioRef.current.currentTime - currentTime) > 0.5) {
             audioRef.current.currentTime = currentTime;
          }
          audioRef.current.play().catch(e => console.log("Audio play error", e));
      }
      bgmRef.current?.play().catch(() => {});
      
      mediaCache.current.forEach(m => {
          if (m instanceof HTMLVideoElement) m.play().catch(() => {});
      });

      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(animate);
    } else if (!isRendering) {
      audioRef.current?.pause();
      bgmRef.current?.pause();
      mediaCache.current.forEach(m => {
          if (m instanceof HTMLVideoElement) m.pause();
      });
      if (canvasRef.current?.getContext('2d')) {
          drawScene(canvasRef.current.getContext('2d')!, currentTime);
      }
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, isRendering, totalDuration, drawScene]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (!isPlaying && audioRef.current) {
        audioRef.current.currentTime = val;
    }
    if (canvasRef.current?.getContext('2d')) {
        drawScene(canvasRef.current.getContext('2d')!, val);
    }
  };

  const handleBgmUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     if(e.target.files?.[0]) setBgmFile(e.target.files[0]);
  };

  const handleRenderExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get export dimensions and bitrate based on quality setting
    const qualitySettings = {
      '720p': { width: 1280, height: 720, bitrate: 8000000 },
      '1080p': { width: 1920, height: 1080, bitrate: 12000000 },
      '4K': { width: 3840, height: 2160, bitrate: 25000000 },
      'vertical': { width: 1080, height: 1920, bitrate: 12000000 }
    };
    const settings = qualitySettings[exportQuality];

    // Temporarily resize canvas for export
    const originalWidth = canvas.width;
    const originalHeight = canvas.height;
    canvas.width = settings.width;
    canvas.height = settings.height;

    // 1. Setup
    let wakeLock: any = null;
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await (navigator as any).wakeLock.request('screen');
        }
    } catch(err) { console.warn('Wake Lock not supported'); }

    // CRITICAL: Use Ref to track rendering state in closure
    isRenderingRef.current = true;
    setIsRendering(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setRenderProgress(0);

    // Stop current audio to prepare for recording
    if(audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    if(bgmRef.current) { bgmRef.current.pause(); bgmRef.current.currentTime = 0; }

    // Prepare Audio Mix
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const exportCtx = new AudioContext();
    const dest = exportCtx.createMediaStreamDestination();
    
    let exportAudio: HTMLAudioElement | null = null;
    let exportBgm: HTMLAudioElement | null = null;
    const promises = [];

    if (audioFile) {
        exportAudio = new Audio(URL.createObjectURL(audioFile));
        const source = exportCtx.createMediaElementSource(exportAudio);
        source.connect(dest);
        promises.push(new Promise<void>(resolve => {
            if(!exportAudio) return resolve();
            exportAudio.oncanplaythrough = () => resolve();
            exportAudio.onerror = () => resolve(); 
        }));
    }

    if (bgmFile) {
        exportBgm = new Audio(URL.createObjectURL(bgmFile));
        exportBgm.volume = 0.15;
        exportBgm.loop = true;
        const source = exportCtx.createMediaElementSource(exportBgm);
        source.connect(dest);
        promises.push(new Promise<void>(resolve => {
             if(!exportBgm) return resolve();
             exportBgm.oncanplaythrough = () => resolve();
             exportBgm.onerror = () => resolve();
        }));
    }

    await Promise.all(promises);

    // 2. Setup Recorder
    const stream = canvas.captureStream(30); 
    if (dest.stream.getAudioTracks().length > 0) {
        stream.addTrack(dest.stream.getAudioTracks()[0]);
    }

    let mimeType = 'video/webm;codecs=vp9';
    if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';

    const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: settings.bitrate
    });
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => { 
        if (e.data.size > 0) chunks.push(e.data); 
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DocuCraft_${exportQuality}_${Date.now()}.${mimeType === 'video/mp4' ? 'mp4' : 'webm'}`;
      a.click();

      // Restore canvas to original size
      if (canvas) {
        canvas.width = originalWidth;
        canvas.height = originalHeight;
      }

      // Cleanup
      isRenderingRef.current = false;
      setIsRendering(false);
      exportCtx.close();
      if(wakeLock) wakeLock.release();
    };

    // 3. Start Recording - Request 1s chunks to ensure data availability
    mediaRecorder.start(1000); 

    if (exportAudio) exportAudio.play();
    if (exportBgm) exportBgm.play();
    
    // Ensure all videos are playing
    mediaCache.current.forEach(m => {
        if (m instanceof HTMLVideoElement) {
            m.currentTime = 0;
            m.play().catch(() => {});
        }
    });

    const startTime = performance.now();
    const ctx = canvas.getContext('2d');
    
    const currentTotalDuration = normalizedTimeline.length > 0 
        ? normalizedTimeline[normalizedTimeline.length - 1].endTimeSec 
        : 10;
    
    // 4. Render Loop (Sync to Audio Clock if possible, or wall clock)
    const tick = () => {
        // Use Ref to check if we should still be rendering
        if (!isRenderingRef.current) {
            if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
            return; 
        }

        const elapsed = (performance.now() - startTime) / 1000;
        
        if (elapsed >= currentTotalDuration) {
            if (ctx) drawScene(ctx, currentTotalDuration);
            
            // Give it a small buffer to ensure the last frame hits the recorder
            setTimeout(() => {
                if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
                if (exportAudio) exportAudio.pause();
                if (exportBgm) exportBgm.pause();
            }, 200);
            return;
        }

        if (ctx) drawScene(ctx, elapsed);
        setRenderProgress(Math.min(100, (elapsed / currentTotalDuration) * 100));
        
        requestAnimationFrame(tick);
    };
    
    // Start Loop
    tick();
  };
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, index: number) => {
     dragItem.current = index;
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
     dragOverItem.current = index;
  };

  const handleSort = () => {
     if (dragItem.current === null || dragOverItem.current === null) return;
     const newTimeline = [...timeline];
     const draggedItemContent = newTimeline[dragItem.current];
     newTimeline.splice(dragItem.current, 1);
     newTimeline.splice(dragOverItem.current, 0, draggedItemContent);
     dragItem.current = null;
     dragOverItem.current = null;
     onUpdateTimeline(newTimeline);
  };

  const deleteScene = (index: number) => {
      const newTimeline = timeline.filter((_, i) => i !== index);
      onUpdateTimeline(newTimeline);
  };

  const addScene = (index: number) => {
      const newScene: TimelineScene = {
          scene_id: Math.random().toString(36),
          scene_summary: "New Scene",
          suggested_duration_seconds: 5,
          selected_images: [],
          motion: 'static',
          reasoning: "User added"
      };
      const newTimeline = [...timeline];
      newTimeline.splice(index + 1, 0, newScene);
      onUpdateTimeline(newTimeline);
  };

  const updateDuration = (index: number, newDuration: number) => {
      if (newDuration < 0.5) return;
      const newTimeline = [...timeline];
      newTimeline[index] = { ...newTimeline[index], suggested_duration_seconds: newDuration };
      onUpdateTimeline(newTimeline);
  };

  const handleEditSave = (sceneId: string | number, updates: Partial<TimelineScene>) => {
    const newTimeline = timeline.map(s => s.scene_id === sceneId ? { ...s, ...updates } : s);
    onUpdateTimeline(newTimeline);
    setEditingSceneId(null);
  };

  const SceneEditor = ({ scene, onClose }: { scene: TimelineScene, onClose: () => void }) => {
    const [duration, setDuration] = useState(scene.suggested_duration_seconds || 5);
    const [motion, setMotion] = useState(scene.motion);
    const [summary, setSummary] = useState(scene.scene_summary);
    const [filter, setFilter] = useState(scene.filter || 'none');
    const [overlayText, setOverlayText] = useState(scene.overlay_text || '');
    const [selectedImages, setSelectedImages] = useState<string[]>(scene.selected_images);
    const [isProcessingAI, setIsProcessingAI] = useState(false);

    const toggleImage = (filename: string) => {
      if (selectedImages.includes(filename)) {
        if (selectedImages.length > 1) setSelectedImages(prev => prev.filter(f => f !== filename));
      } else {
        setSelectedImages(prev => [...prev, filename]);
      }
    };

    const handleError = (e: any) => {
         let msg = "An error occurred";
         if (e instanceof Error) msg = e.message;
         else if (typeof e === 'string') msg = e;
         else msg = JSON.stringify(e);
         onError(msg);
    };

    const handleMagicEdit = async (imgName: string) => {
        const userPrompt = window.prompt("How should AI edit this image? (e.g. 'Add a vintage filter', 'Remove the person')");
        if (!userPrompt) return;
        
        setIsProcessingAI(true);
        try {
            const originalImg = images.find(img => img.file?.name === imgName || img.analysis?.filename === imgName);
            if (!originalImg || !originalImg.file) return;
            
            const newImageDataUri = await editImageAI(originalImg.file, userPrompt);
            setSelectedImages(prev => prev.map(p => p === imgName ? newImageDataUri : p));
        } catch (e) {
            handleError(e);
        } finally {
            setIsProcessingAI(false);
        }
    };

    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mt-2 mb-4 animate-in slide-in-from-top-2">
        <div className="flex justify-between items-center mb-4">
           <h4 className="font-semibold text-white flex items-center gap-2"><Edit className="w-4 h-4" /> Edit Scene {isProcessingAI && <Loader2 className="w-4 h-4 animate-spin text-blue-400"/>}</h4>
           <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Scene Description</label>
                <textarea className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200" rows={2} value={summary} onChange={e => setSummary(e.target.value)}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1">Duration (s)</label>
                    <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200" value={duration} onChange={e => setDuration(parseFloat(e.target.value))} step={0.5} min={1}/>
                 </div>
                 <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1">Motion</label>
                    <select className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200" value={motion} onChange={e => setMotion(e.target.value)}>
                      <option value="static">Static</option><option value="slow_zoom_in">Slow Zoom In</option><option value="slow_zoom_out">Slow Zoom Out</option><option value="pan_left">Pan Left</option><option value="pan_right">Pan Right</option>
                    </select>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="text-xs text-blue-400 font-medium block mb-1 flex items-center gap-1"><Palette className="w-3 h-3"/> Filter</label>
                    <select className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200" value={filter} onChange={e => setFilter(e.target.value as any)}>
                      <option value="none">None</option><option value="cinematic">Cinematic</option><option value="noir">Noir (B&W)</option><option value="vintage">Vintage</option><option value="muted">Muted</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-blue-400 font-medium block mb-1 flex items-center gap-1"><Type className="w-3 h-3"/> Text Overlay</label>
                    <input type="text" placeholder="Title / Lower Third" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200" value={overlayText} onChange={e => setOverlayText(e.target.value)} />
                  </div>
              </div>
           </div>

           <div className="space-y-3">
              <label className="text-xs text-slate-400 font-medium block">Selected Footage ({selectedImages.length})</label>
              <div className="flex gap-2 overflow-x-auto pb-2 min-h-[60px] custom-scrollbar">
                 {selectedImages.map((name, i) => {
                   const isEdited = name.startsWith('data:image');
                   let src = name;
                   if (!isEdited) {
                       const img = images.find(im => im.file?.name === name || im.analysis?.filename === name);
                       src = img?.previewUrl || '';
                   }

                   return (
                     <div key={i} className="relative w-16 h-16 flex-shrink-0 group bg-black rounded border border-blue-500 overflow-hidden">
                        <img src={src} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                            <button onClick={() => handleMagicEdit(name)} title="Magic Edit" className="text-white bg-purple-500 rounded-full p-1"><Wand2 className="w-2 h-2" /></button>
                            <button onClick={() => toggleImage(name)} className="text-white bg-red-500 rounded-full p-1"><X className="w-2 h-2" /></button>
                        </div>
                     </div>
                   );
                 })}
              </div>
              <div className="border-t border-slate-800 pt-2">
                 <label className="text-xs text-slate-500 font-medium block mb-2">Available Footage</label>
                 <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {images.map(img => {
                       const name = img.file?.name || img.analysis?.filename || img.id;
                       const isSelected = selectedImages.includes(name);
                       return (
                         <div key={img.id} onClick={() => toggleImage(name)} className={`relative aspect-square cursor-pointer rounded overflow-hidden border-2 ${isSelected ? 'border-blue-500' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                            {img.mediaType === 'video' ? <video src={img.previewUrl} className="w-full h-full object-cover"/> : <img src={img.previewUrl} className="w-full h-full object-cover" />}
                            {isSelected && <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5"><Plus className="w-2 h-2 text-white" /></div>}
                            {img.mediaType === 'video' && <div className="absolute bottom-1 right-1 bg-black/50 rounded px-1 text-[8px] text-white">VIDEO</div>}
                         </div>
                       );
                    })}
                 </div>
              </div>
           </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-slate-800">
           <button onClick={onClose} className="px-3 py-1.5 rounded text-sm text-slate-300 hover:text-white">Cancel</button>
           <button onClick={() => handleEditSave(scene.scene_id, { suggested_duration_seconds: duration, motion, scene_summary: summary, filter: filter as any, overlay_text: overlayText, selected_images: selectedImages })} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm flex items-center gap-2"><Save className="w-3 h-3" /> Save Changes</button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 pb-20">
      {/* Hidden container for caching videos to prevent browser throttling */}
      <div ref={hiddenMediaContainerRef} style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}></div>

      <div className="flex flex-col md:flex-row items-center justify-between py-4 border-b border-slate-700 gap-4">
        <div><h2 className="text-2xl font-bold text-white">Timeline Result</h2><p className="text-slate-400 text-sm">Review, edit, and export your documentary.</p></div>
        <div className="flex items-center gap-3">
            <div className="relative overflow-hidden group">
                 <button className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    <Music className="w-4 h-4" /> {bgmFile ? bgmFile.name.substring(0,15)+'...' : 'Add BGM'}
                 </button>
                 <input type="file" accept="audio/*" onChange={handleBgmUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <button onClick={onReset} className="px-3 py-2 text-sm text-slate-300 hover:text-white transition-colors">Start Over</button>
        </div>
      </div>

      <div className="bg-black rounded-xl overflow-hidden border border-slate-700 shadow-2xl relative group">
        <div className="aspect-video relative">
          <canvas ref={canvasRef} width={1920} height={1080} className="w-full h-full object-contain" />
          {isRendering && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-20 px-8">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <h3 className="text-white font-bold text-2xl mb-2">Rendering Final Video</h3>
              <p className="text-slate-400 text-sm mb-6 text-center max-w-md">Mixing Audio & Applying Effects.<br/>Please <strong className="text-white">do not switch tabs</strong> or minimize this window, or the video may freeze.</p>
              
              <div className="w-full max-w-md h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-4"><div className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300 ease-linear" style={{ width: `${renderProgress}%` }} /></div>
              
              <div className="flex items-center gap-2 text-amber-400 bg-amber-950/50 px-4 py-2 rounded-lg border border-amber-900/50">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-mono">Keep tab active to prevent throttling</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900 p-4 border-t border-slate-800 space-y-4">
           <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-slate-400">{formatTime(currentTime)}</span>
              <input type="range" min={0} max={totalDuration} step={0.1} value={currentTime} onChange={handleSeek} className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" disabled={isRendering} />
              <span className="text-xs font-mono text-slate-400">{formatTime(totalDuration)}</span>
           </div>
           <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 <button onClick={() => setIsPlaying(!isPlaying)} disabled={isRendering} className="w-10 h-10 flex items-center justify-center bg-white text-black hover:bg-slate-200 rounded-full transition-colors">{isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}</button>
                 <button onClick={() => { setIsPlaying(false); setCurrentTime(0); }} className="text-slate-400 hover:text-white p-2"><RotateCcw className="w-5 h-5" /></button>
                 {audioFile && <button onClick={() => { if(audioRef.current) audioRef.current.muted = !audioRef.current.muted; setIsMuted(!isMuted); }} className={`p-2 ${isMuted ? 'text-red-400' : 'text-slate-400'}`}>{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>}
              </div>
              <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                 <button onClick={() => setShowCaptions(!showCaptions)} className={`p-2 rounded text-xs font-medium flex items-center gap-2 ${showCaptions ? 'bg-slate-700 text-white' : 'text-slate-400'}`}><Captions className="w-4 h-4" /> Captions</button>
                 <button onClick={() => setCinemaMode(!cinemaMode)} className={`p-2 rounded text-xs font-medium flex items-center gap-2 ${cinemaMode ? 'bg-slate-700 text-white' : 'text-slate-400'}`}><Tv className="w-4 h-4" /> Cinema</button>
                 <button onClick={() => setShowVisualizer(!showVisualizer)} className={`p-2 rounded text-xs font-medium flex items-center gap-2 ${showVisualizer ? 'bg-slate-700 text-white' : 'text-slate-400'}`}><Activity className="w-4 h-4" /> Visualizer</button>
              </div>
              <div className="flex items-center gap-2">
                 <select
                    value={exportQuality}
                    onChange={(e) => setExportQuality(e.target.value as any)}
                    disabled={isRendering}
                    title="Export Quality"
                    aria-label="Export Quality"
                    className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 >
                    <option value="720p">720p (HD)</option>
                    <option value="1080p">1080p (Full HD)</option>
                    <option value="4K">4K (Ultra HD)</option>
                    <option value="vertical">Vertical (1080x1920)</option>
                 </select>
                 <button type="button" onClick={handleRenderExport} disabled={isRendering} className={`px-5 py-2.5 rounded-lg font-bold text-white flex items-center gap-2 shadow-lg transition-transform hover:scale-105 ${isRendering ? 'bg-slate-700 cursor-wait' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>{isRendering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Film className="w-5 h-5" />} Export Video</button>
              </div>
           </div>
        </div>
      </div>

      <div className="pt-4 pb-10">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center justify-between">
           <span>Timeline Scenes</span>
           <span className="text-xs normal-case text-slate-400 font-normal">Drag to reorder • Adjust time to sync</span>
        </h3>
        <div className="space-y-2">
          {normalizedTimeline.map((scene, idx) => (
             <div 
                key={scene.scene_id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragEnter={(e) => handleDragEnter(e, idx)}
                onDragEnd={handleSort}
                onDragOver={(e) => e.preventDefault()}
                className="transition-transform duration-200"
             >
                 {editingSceneId === scene.scene_id ? (
                     <SceneEditor scene={scene} onClose={() => setEditingSceneId(null)} />
                 ) : (
                     <div className={`p-3 rounded border flex items-center gap-4 group/scene transition-all cursor-grab active:cursor-grabbing ${currentTime >= scene.startTimeSec && currentTime < scene.endTimeSec ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'}`}>
                        <div className="flex flex-col items-center gap-2 mr-2 text-slate-600">
                            <GripVertical className="w-5 h-5 opacity-50 group-hover/scene:opacity-100 transition-opacity" />
                            <div className="text-slate-500 font-mono text-xs w-6 text-center">{idx + 1}</div>
                        </div>
                        
                        {/* Thumbnail Stack */}
                        <div className="flex -space-x-8 items-center">
                            {scene.selected_images.slice(0, 3).map((imgName, i) => {
                                const isEdited = imgName.startsWith('data:image');
                                let src = imgName;
                                if (!isEdited) {
                                   const img = images.find(im => im.file?.name === imgName || im.analysis?.filename === imgName);
                                   src = img?.previewUrl || '';
                                }
                                return (
                                <div key={i} className="w-16 h-9 bg-slate-900 rounded overflow-hidden flex-shrink-0 border border-slate-600 shadow-md relative z-0 hover:z-10 transition-all">
                                   <img src={src} className="w-full h-full object-cover"/>
                                   {isEdited && <div className="absolute top-0 left-0 bg-purple-500 w-2 h-2 rounded-br-full"/>}
                                </div>
                            )})}
                        </div>

                        <div className="flex-1 ml-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="cursor-pointer" onClick={() => setEditingSceneId(scene.scene_id)}>
                               <p className="text-sm text-slate-200 line-clamp-1 font-medium">{scene.scene_summary}</p>
                               <p className="text-xs text-blue-400 flex items-center gap-2 mt-0.5">
                                    <span className="text-slate-500 italic">{formatTime(scene.startTimeSec)} - {formatTime(scene.endTimeSec)}</span>
                               </p>
                           </div>
                           
                           {/* Quick Duration Adjuster */}
                           <div className="flex items-center gap-2 justify-start md:justify-end">
                                <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-1">
                                    <button 
                                        onClick={() => updateDuration(idx, (scene.suggested_duration_seconds || 5) - 0.5)}
                                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                                    >-</button>
                                    <div className="w-16 text-center text-xs font-mono text-slate-300 flex items-center justify-center gap-1">
                                        <Clock className="w-3 h-3 text-slate-500" />
                                        {(scene.suggested_duration_seconds || 5).toFixed(1)}s
                                    </div>
                                    <button 
                                        onClick={() => updateDuration(idx, (scene.suggested_duration_seconds || 5) + 0.5)}
                                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                                    >+</button>
                                </div>
                           </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover/scene:opacity-100 transition-opacity">
                            <button onClick={() => addScene(idx)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors" title="Insert Scene After"><Plus className="w-4 h-4"/></button>
                            <button onClick={() => deleteScene(idx)} className="p-2 text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors" title="Delete Scene"><Trash2 className="w-4 h-4"/></button>
                            <button onClick={() => setEditingSceneId(scene.scene_id)} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"><Edit className="w-4 h-4"/></button>
                        </div>
                     </div>
                 )}
             </div>
          ))}
        </div>
        <button onClick={() => addScene(normalizedTimeline.length - 1)} className="w-full mt-4 py-3 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center gap-2 font-medium">
            <Plus className="w-5 h-5" /> Add Scene at End
        </button>
      </div>
    </div>
  );
};

export default TimelineView;
