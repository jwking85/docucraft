
import React, { useState } from 'react';
import { FileText, Type, Upload, Music, Mic, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { ScriptType } from '../types';
import { generateVoiceover, enhanceScript } from '../services/geminiService';

interface ScriptInputProps {
  scriptContent: string;
  setScriptContent: (val: string) => void;
  scriptType: ScriptType;
  setScriptType: (val: ScriptType) => void;
  onNext: () => void;
  audioFile: File | null;
  setAudioFile: (file: File | null) => void;
}

const ScriptInput: React.FC<ScriptInputProps> = ({ 
  scriptContent, 
  setScriptContent, 
  scriptType, 
  setScriptType,
  onNext,
  audioFile,
  setAudioFile
}) => {
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setScriptContent(ev.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const handleGenerateVoice = async () => {
    if (!scriptContent) return;
    setIsGeneratingVoice(true);
    try {
      let textToRead = scriptContent;
      if (scriptType === ScriptType.SRT) {
         textToRead = scriptContent.replace(/\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n/g, '').replace(/\n\n/g, ' ');
      }
      const file = await generateVoiceover(textToRead.substring(0, 1000));
      setAudioFile(file);
    } catch (e) {
      console.error(e);
      alert("Failed to generate voiceover.");
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleEnhanceScript = async () => {
    if(!scriptContent) return;
    setIsEnhancing(true);
    try {
        const enhanced = await enhanceScript(scriptContent);
        setScriptContent(enhanced);
    } catch (e) {
        console.error(e);
        alert("Failed to enhance script.");
    } finally {
        setIsEnhancing(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">1. Script & Audio</h2>
        <div className="flex bg-slate-800 p-1 rounded-lg">
          <button onClick={() => setScriptType(ScriptType.PLAIN_TEXT)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${scriptType === ScriptType.PLAIN_TEXT ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>Plain Text</button>
          <button onClick={() => setScriptType(ScriptType.SRT)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${scriptType === ScriptType.SRT ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>SRT (Subtitles)</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <label className="text-slate-300 font-medium flex items-center gap-2">
              {scriptType === ScriptType.SRT ? <FileText className="w-4 h-4"/> : <Type className="w-4 h-4"/>}
              {scriptType === ScriptType.SRT ? 'Upload .srt file or paste content' : 'Paste your narration script'}
            </label>
            <div className="flex gap-3">
                <button 
                    onClick={handleEnhanceScript}
                    disabled={!scriptContent || isEnhancing}
                    className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 disabled:opacity-50"
                >
                    {isEnhancing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                    Fact Check & Enhance
                </button>
                <div className="relative">
                <input type="file" accept={scriptType === ScriptType.SRT ? ".srt" : ".txt"} onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <button className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300"><Upload className="w-3 h-3" /> Import Text</button>
                </div>
            </div>
          </div>
          <textarea
            value={scriptContent}
            onChange={(e) => setScriptContent(e.target.value)}
            placeholder="Welcome to the nostalgic journey..."
            className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-sm resize-none"
          />
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <label className="text-slate-300 font-medium flex items-center gap-2"><Music className="w-4 h-4"/> Voiceover / Audio Track (Optional)</label>
            <div className="text-xs text-slate-500">Supports MP3, WAV</div>
          </div>
          <div className="mt-4 flex gap-4">
              <div className="flex-1 border-2 border-dashed border-slate-600 rounded-lg p-4 hover:bg-slate-700/50 transition-colors relative group">
                <input type="file" accept="audio/*" onChange={handleAudioUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className="flex items-center justify-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-full text-blue-400"><Music className="w-5 h-5" /></div>
                  <div className="text-sm">{audioFile ? <span className="text-green-400 font-medium">{audioFile.name}</span> : <span className="text-slate-400 group-hover:text-slate-300">Upload Recording</span>}</div>
                </div>
              </div>
              <button onClick={handleGenerateVoice} disabled={!scriptContent || isGeneratingVoice || !!audioFile} className={`flex-1 border-2 border-slate-600 rounded-lg p-4 transition-colors flex items-center justify-center gap-3 ${!scriptContent || !!audioFile ? 'opacity-50 cursor-not-allowed bg-slate-800' : 'hover:bg-slate-700/50 bg-slate-800 hover:border-blue-500/50'}`}>
                 <div className="p-2 bg-purple-500/20 rounded-full text-purple-400">{isGeneratingVoice ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}</div>
                 <div className="text-sm text-left"><span className="block font-medium text-slate-200">Generate AI Voice</span><span className="text-xs text-slate-500">Using Gemini TTS</span></div>
              </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={onNext} disabled={!scriptContent} className={`px-6 py-2.5 rounded-lg font-medium text-white transition-all flex items-center gap-2 ${!scriptContent ? 'bg-slate-700 cursor-not-allowed text-slate-500' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20'}`}>Next: Upload Footage <ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};

export default ScriptInput;
