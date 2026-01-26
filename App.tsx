
import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Loader2, ArrowRight, Save, Upload, Clapperboard, Lock, Unlock, KeyRound, Settings } from 'lucide-react';
import { ProcessedImage, AppStep, TimelineScene, ScriptType, ProjectFile } from './types';
import StoryWorkspace from './components/StoryWorkspace';
import TimelineView from './components/TimelineView';
import QuickStartGuide from './components/QuickStartGuide';
import SettingsPanel from './components/SettingsPanel';
import { BackgroundMusicConfig } from './components/BackgroundMusicSelector';

// Helpers for Base64 conversion
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const base64ToBlob = async (base64: string): Promise<Blob> => {
  const res = await fetch(base64);
  return res.blob();
};

const App: React.FC = () => {
  // Lock screen state
  const [isLocked, setIsLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [lockError, setLockError] = useState(false);

  // State
  const [step, setStep] = useState<AppStep>(AppStep.WORKSPACE);
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [timeline, setTimeline] = useState<TimelineScene[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentAudioFile, setCurrentAudioFile] = useState<File | null>(null);
  const [backgroundMusic, setBackgroundMusic] = useState<BackgroundMusicConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const loadInputRef = useRef<HTMLInputElement>(null);

  // Check for stored access on mount
  useEffect(() => {
    const hasAccess = localStorage.getItem("docucraft_access_granted");
    if (hasAccess === "true") {
      setIsLocked(false);
    }

    // Check if first time user
    const hasSeenGuide = localStorage.getItem("docucraft_seen_guide");
    if (!hasSeenGuide && hasAccess === "true") {
      setShowQuickStart(true);
    }
  }, []);

  // Cleanup blob URLs when images change or component unmounts
  useEffect(() => {
    return () => {
      images.forEach(img => {
        if (img.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
    };
  }, [images]);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save: Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveProject();
      }
      // Switch to Workspace: Alt+1
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setStep(AppStep.WORKSPACE);
      }
      // Switch to Export: Alt+2
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        if (timeline.length > 0) setStep(AppStep.EXPORT);
      }
      // Play/Pause in Export view: Space (when not in input)
      if (e.key === ' ' && step === AppStep.EXPORT && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        // Will be handled by TimelineView
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images, timeline, currentAudioFile, step]);

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    if (isLocked || (timeline.length === 0 && images.length === 0)) return;

    const autoSaveInterval = setInterval(() => {
      try {
        const autoSaveData = {
          timestamp: Date.now(),
          timeline,
          images: images.map(img => ({
            id: img.id,
            previewUrl: img.previewUrl,
            source: img.source,
            mediaType: img.mediaType
          }))
        };
        localStorage.setItem('docucraft_autosave', JSON.stringify(autoSaveData));
        console.log('Auto-saved project');
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [timeline, images, isLocked]);

  // Auth State (API Key)
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  useEffect(() => {
    if (isLocked) return; // Don't check API key until unlocked

    async function checkKey() {
      if (window.aistudio) {
        try {
            const has = await window.aistudio.hasSelectedApiKey();
            setHasApiKey(has);
        } catch(e) {
            console.error("Failed to check API key", e);
            setHasApiKey(false);
        }
      } else {
        setHasApiKey(true);
      }
      setIsCheckingKey(false);
    }
    checkKey();
  }, [isLocked]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const accessCode = process.env.ACCESS_CODE || "";

    if (passwordInput === accessCode) {
      setIsLocked(false);
      localStorage.setItem("docucraft_access_granted", "true");
      setLockError(false);
    } else {
      setLockError(true);
      setPasswordInput("");
    }
  };

  const handleLock = () => {
    setIsLocked(true);
    localStorage.removeItem("docucraft_access_granted");
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
        try {
            await window.aistudio.openSelectKey();
            setHasApiKey(true);
            setError(null);
        } catch(e) {
            console.error("Failed to select key", e);
            setError("Failed to select API Key. Please try again.");
        }
    }
  };

  const handleWorkspaceComplete = (generatedTimeline: TimelineScene[], audioFile: File | null) => {
     setTimeline(generatedTimeline);
     setCurrentAudioFile(audioFile);
     setStep(AppStep.EXPORT);
  };

  const handleReset = () => {
     const hasContent = timeline.length > 0 || images.length > 0 || currentAudioFile;
     if (!hasContent) {
         setStep(AppStep.WORKSPACE);
         return;
     }

     const message = "Reset Project?\n\nThis will clear all scenes, images, and audio. Any unsaved progress will be lost.\n\nConsider saving your project first (Ctrl+S).";
     if(confirm(message)) {
         setStep(AppStep.WORKSPACE);
         setTimeline([]);
         setCurrentAudioFile(null);
         setImages([]);
     }
  };

  // --- SAVE / LOAD LOGIC ---
  const handleSaveProject = async () => {
      setIsSaving(true);
      try {
          const projectImages = await Promise.all(images.map(async (img) => {
              let data = img.previewUrl;
              if (img.previewUrl.startsWith('blob:')) {
                  if (img.file) {
                      data = await blobToBase64(img.file);
                  } else {
                      const blob = await (await fetch(img.previewUrl)).blob();
                      data = await blobToBase64(blob);
                  }
              }
              return {
                  id: img.id,
                  name: img.file?.name || img.id,
                  type: img.file?.type || (img.mediaType === 'video' ? 'video/mp4' : 'image/png'),
                  data: data,
                  source: img.source,
                  mediaType: img.mediaType,
                  analysis: img.analysis
              };
          }));

          let audioData = undefined;
          if (currentAudioFile) {
              audioData = await blobToBase64(currentAudioFile);
          }

          const project: ProjectFile = {
              version: 1,
              timestamp: Date.now(),
              images: projectImages,
              timeline: timeline,
              script: "",
              audioData,
              audioName: currentAudioFile?.name
          };

          const json = JSON.stringify(project);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `DocuCraft_Project_${new Date().toISOString().slice(0,10)}.json`;
          a.click();
      } catch (e) {
          console.error("Save failed", e);
          setError("Failed to save project. File size might be too large.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleLoadProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsLoading(true);
      try {
          const text = await file.text();
          const project: ProjectFile = JSON.parse(text);

          const restoredImages: ProcessedImage[] = await Promise.all(project.images.map(async (imgData) => {
              const blob = await base64ToBlob(imgData.data);
              const file = new File([blob], imgData.name, { type: imgData.type });
              return {
                  id: imgData.id,
                  file: file,
                  previewUrl: URL.createObjectURL(file),
                  source: imgData.source,
                  mediaType: imgData.mediaType,
                  isAnalyzing: false,
                  analysis: imgData.analysis
              };
          }));

          let restoredAudio = null;
          if (project.audioData && project.audioName) {
              const blob = await base64ToBlob(project.audioData);
              restoredAudio = new File([blob], project.audioName, { type: 'audio/wav' });
          }

          setImages(restoredImages);
          setTimeline(project.timeline);
          setCurrentAudioFile(restoredAudio);
          
          if (project.timeline.length > 0) {
              setStep(AppStep.EXPORT);
          } else {
              setStep(AppStep.WORKSPACE);
          }
      } catch (e) {
          console.error("Load failed", e);
          setError("Failed to load project file. It may be corrupted.");
      } finally {
          setIsLoading(false);
          if (loadInputRef.current) loadInputRef.current.value = '';
      }
  };

  // Render lock screen
  if (isLocked) {
    return (
        <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-center p-6 text-slate-200 font-sans relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_10%,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#09090b] to-[#09090b] z-0 pointer-events-none"></div>

            <div className="z-10 w-full max-w-sm bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-6 mx-auto shadow-inner border border-slate-700/50">
                    <Lock className="w-6 h-6 text-slate-400" />
                </div>

                <h1 className="text-xl font-semibold mb-2 text-white tracking-tight">DocuCraft Studio</h1>
                <p className="text-slate-500 mb-6 text-sm">Private Access Required</p>

                <form onSubmit={handleUnlock} className="space-y-4">
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
                        <input
                            type="password"
                            value={passwordInput}
                            onChange={(e) => { setPasswordInput(e.target.value); setLockError(false); }}
                            className={`w-full bg-black/50 border ${lockError ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-indigo-500'} rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all`}
                            placeholder="Enter Access Code"
                            autoFocus
                        />
                    </div>
                    {lockError && <p className="text-red-400 text-[10px] text-left pl-1 font-medium animate-pulse">Incorrect access code.</p>}

                    <button
                        type="submit"
                        className="w-full bg-white hover:bg-slate-200 text-black font-semibold py-2.5 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
                    >
                        Unlock <Unlock className="w-3 h-3" />
                    </button>
                </form>
            </div>
        </div>
    );
  }

  if (isCheckingKey) {
      return (
          <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
      );
  }

  if (!hasApiKey) {
      return (
          <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-center p-6 text-white font-sans">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-indigo-900/30">
                  <Clapperboard className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-4 tracking-tight">DocuCraft</h1>
              <p className="text-slate-400 max-w-md mb-8 text-lg leading-relaxed">
                 Professional AI Documentary Suite.
              </p>
              <button 
                  onClick={handleSelectKey}
                  className="px-8 py-3 bg-white text-slate-950 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all flex items-center gap-2 shadow-xl hover:scale-105 transform duration-200"
              >
                  Connect API Key <ArrowRight className="w-4 h-4"/>
              </button>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden flex flex-col">
      {/* Studio Header */}
      <header className="h-14 border-b border-slate-800 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-900/20">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
               <h1 className="text-sm font-bold tracking-tight text-white leading-none">DocuCraft</h1>
               <span className="text-[10px] text-slate-500 font-mono tracking-wider">STUDIO PRO v1.0</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-sm font-medium">
             {/* Save/Load Controls */}
             <div className="flex items-center bg-slate-900 rounded-md p-0.5 border border-slate-800 mr-2">
                 <button
                    onClick={handleSaveProject}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
                    title="Save Project (Ctrl+S) - Saves all scenes, audio, and settings"
                 >
                     {isSaving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>}
                     {isSaving ? 'Saving...' : 'Save'}
                 </button>
                 <div className="w-px h-3 bg-slate-800 mx-0.5"></div>
                 <button
                    onClick={() => loadInputRef.current?.click()}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
                    title="Load Project - Import a previously saved project"
                 >
                     {isLoading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3"/>}
                     {isLoading ? 'Loading...' : 'Load'}
                 </button>
                 <input type="file" ref={loadInputRef} onChange={handleLoadProject} accept=".json" className="hidden" />
             </div>

             <nav className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                 <button
                   onClick={() => setStep(AppStep.WORKSPACE)}
                   className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${step === AppStep.WORKSPACE ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                   title="Create & Edit Documentary (Ctrl+Alt+1)"
                 >
                   📝 Workspace
                 </button>
                 <button
                   onClick={() => setStep(AppStep.EXPORT)}
                   disabled={timeline.length === 0}
                   className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${step === AppStep.EXPORT ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/50' : timeline.length === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                   title={timeline.length === 0 ? 'Create a timeline first in Workspace' : 'Export & Render Video (Ctrl+Alt+2)'}
                 >
                   🎬 Export {timeline.length > 0 && `(${timeline.length} scenes)`}
                 </button>
             </nav>

             <div className="w-px h-4 bg-slate-800 mx-1" />

             <button
                onClick={() => setShowQuickStart(true)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors font-medium"
                title="Show Quick Start Guide"
             >
                💡 Help
             </button>

             <button
                onClick={() => setShowSettings(true)}
                className="text-slate-500 hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded"
                title="API Settings"
             >
                <Settings className="w-4 h-4" />
             </button>

             <button
                onClick={handleLock}
                className="text-slate-500 hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded"
                title="Lock Studio (Require Password)"
             >
                <Lock className="w-4 h-4" />
             </button>
          </div>
      </header>

      {/* Quick Start Guide */}
      {showQuickStart && (
        <QuickStartGuide
          onClose={() => {
            setShowQuickStart(false);
            localStorage.setItem("docucraft_seen_guide", "true");
          }}
        />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-950/90 border border-red-500/30 text-red-200 px-4 py-2 rounded-lg flex items-center gap-3 backdrop-blur-md shadow-xl animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-white"><span className="sr-only">Dismiss</span>×</button>
          </div>
        )}

        <div className="h-full w-full max-w-[1920px] mx-auto p-4 md:p-6">
            {step === AppStep.WORKSPACE && (
            <StoryWorkspace 
                onComplete={handleWorkspaceComplete} 
                images={images} 
                setImages={setImages} 
                onError={setError}
            />
            )}

            {step === AppStep.EXPORT && (
                <TimelineView
                    timeline={timeline}
                    onUpdateTimeline={setTimeline}
                    images={images}
                    onReset={handleReset}
                    audioFile={currentAudioFile}
                    backgroundMusic={backgroundMusic}
                    onBackgroundMusicChange={setBackgroundMusic}
                    scriptContent={""}
                    scriptType={ScriptType.PLAIN_TEXT}
                    onError={setError}
                />
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
