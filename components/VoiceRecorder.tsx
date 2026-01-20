import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Download, Trash2, RefreshCw, Volume2 } from 'lucide-react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioFile: File) => void;
  onError: (message: string) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete, onError }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1.0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      stopRecording();
    };
  }, []);

  // Update audio player volume
  useEffect(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.volume = volume;
    }
  }, [volume]);

  const startRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });

      // Use the best available audio format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000 // High quality
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(audioBlob);

        // Create preview URL
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        onError('Recording failed. Please check your microphone.');
        stopRecording();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      if (err instanceof Error && err.name === 'NotAllowedError') {
        onError('Microphone access denied. Please allow microphone permissions.');
      } else if (err instanceof Error && err.name === 'NotFoundError') {
        onError('No microphone found. Please connect a microphone.');
      } else {
        onError('Failed to start recording. Please check your microphone.');
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playPreview = () => {
    if (!audioUrl) return;

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }

    const audio = new Audio(audioUrl);
    audio.volume = volume;
    audioPlayerRef.current = audio;

    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      onError('Failed to play audio preview.');
      setIsPlaying(false);
    };

    audio.play();
    setIsPlaying(true);
  };

  const stopPreview = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const saveRecording = () => {
    if (!audioBlob) return;

    // Convert blob to File
    const file = new File(
      [audioBlob],
      `voiceover-${Date.now()}.webm`,
      { type: audioBlob.type }
    );

    onRecordingComplete(file);
    resetRecording();
  };

  const downloadRecording = () => {
    if (!audioUrl || !audioBlob) return;

    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `voiceover-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
    audioChunksRef.current = [];
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 bg-gradient-to-br from-purple-950/40 to-indigo-950/40 rounded-xl border border-purple-800/40">
      <div className="flex items-center gap-2 mb-4">
        <Mic className="w-5 h-5 text-purple-400" />
        <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wide">
          Voice Recording Studio
        </h3>
      </div>

      {/* Recording Timer */}
      <div className="mb-4 text-center">
        <div className={`text-4xl font-mono font-bold tracking-wider ${
          isRecording ? 'text-red-400 animate-pulse' : 'text-slate-400'
        }`}>
          {formatTime(recordingTime)}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {isRecording ? (isPaused ? 'PAUSED' : 'RECORDING...') : audioBlob ? 'READY TO USE' : 'Ready to record'}
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex gap-2 mb-4">
        {!isRecording && !audioBlob && (
          <button
            onClick={startRecording}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-red-500/30 flex items-center justify-center gap-2"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </button>
        )}

        {isRecording && !isPaused && (
          <>
            <button
              onClick={pauseRecording}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-yellow-500/30 flex items-center justify-center gap-2"
            >
              <Pause className="w-5 h-5" />
              Pause
            </button>
            <button
              onClick={stopRecording}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-red-500/30 flex items-center justify-center gap-2"
            >
              <Square className="w-5 h-5" />
              Stop
            </button>
          </>
        )}

        {isRecording && isPaused && (
          <>
            <button
              onClick={resumeRecording}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-green-500/30 flex items-center justify-center gap-2"
            >
              <Mic className="w-5 h-5" />
              Resume
            </button>
            <button
              onClick={stopRecording}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-red-500/30 flex items-center justify-center gap-2"
            >
              <Square className="w-5 h-5" />
              Stop
            </button>
          </>
        )}

        {audioBlob && !isRecording && (
          <>
            {!isPlaying ? (
              <button
                onClick={playPreview}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Preview
              </button>
            ) : (
              <button
                onClick={stopPreview}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-orange-500/30 flex items-center justify-center gap-2"
              >
                <Square className="w-5 h-5" />
                Stop Preview
              </button>
            )}
            <button
              onClick={resetRecording}
              className="px-4 py-3 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-800 hover:to-slate-700 text-white rounded-lg font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Volume Control (for preview) */}
      {audioBlob && (
        <div className="mb-4 p-3 bg-slate-950/50 rounded-lg border border-slate-800">
          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 accent-purple-500"
            />
            <span className="text-xs text-slate-400 w-8">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {audioBlob && !isRecording && (
        <div className="flex gap-2">
          <button
            onClick={saveRecording}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-green-500/30 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Use This Recording
          </button>
          <button
            onClick={downloadRecording}
            className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Tips */}
      <div className="mt-4 p-3 bg-indigo-950/30 rounded-lg border border-indigo-900/40">
        <p className="text-xs text-indigo-300 font-medium mb-2">💡 Recording Tips:</p>
        <ul className="text-[10px] text-slate-400 space-y-1">
          <li>• Use a quiet room with minimal background noise</li>
          <li>• Position microphone 6-12 inches from your mouth</li>
          <li>• Speak clearly and at a steady pace</li>
          <li>• Pause briefly between major points</li>
          <li>• Use pause/resume to take breaks without stopping</li>
        </ul>
      </div>
    </div>
  );
};

export default VoiceRecorder;
