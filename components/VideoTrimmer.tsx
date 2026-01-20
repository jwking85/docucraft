import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Scissors, Check, X, SkipBack, SkipForward, Clock, Film } from 'lucide-react';

interface VideoTrimmerProps {
  videoFile: File;
  onTrimComplete: (trimmedFile: File, startTime: number, endTime: number) => void;
  onCancel: () => void;
}

const VideoTrimmer: React.FC<VideoTrimmerProps> = ({ videoFile, onTrimComplete, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [isTrimming, setIsTrimming] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setEndTime(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      // Auto-pause at end of trim region
      if (video.currentTime >= endTime) {
        video.pause();
        setIsPlaying(false);
        video.currentTime = startTime;
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      video.currentTime = startTime;
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [startTime, endTime]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      // Start from beginning of trim region if at end
      if (video.currentTime >= endTime || video.currentTime < startTime) {
        video.currentTime = startTime;
      }
      video.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(startTime, Math.min(time, endTime));
    setCurrentTime(video.currentTime);
  };

  const setInPoint = () => {
    setStartTime(currentTime);
    if (currentTime >= endTime) {
      setEndTime(Math.min(duration, currentTime + 1));
    }
  };

  const setOutPoint = () => {
    setEndTime(currentTime);
    if (currentTime <= startTime) {
      setStartTime(Math.max(0, currentTime - 1));
    }
  };

  const jumpToStart = () => {
    handleSeek(startTime);
  };

  const jumpToEnd = () => {
    handleSeek(endTime);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const getTrimDuration = (): number => {
    return endTime - startTime;
  };

  const handleTrim = async () => {
    setIsTrimming(true);

    try {
      // Create a new file with metadata about the trim
      // The actual trimming will happen during video export in the rendering pipeline
      const trimmedFile = new File([videoFile], videoFile.name, {
        type: videoFile.type
      });

      // Add trim metadata as a property (will be used during rendering)
      (trimmedFile as any).trimStart = startTime;
      (trimmedFile as any).trimEnd = endTime;

      onTrimComplete(trimmedFile, startTime, endTime);
    } catch (error) {
      console.error('Error trimming video:', error);
      alert('Failed to trim video. Please try again.');
    } finally {
      setIsTrimming(false);
    }
  };

  const trimDuration = getTrimDuration();
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Video Trimmer</h2>
              <p className="text-xs text-slate-400">Cut your video to the perfect length</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Video Player */}
        <div className="p-6">
          <div className="relative bg-black rounded-xl overflow-hidden mb-4 aspect-video">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
            />

            {/* Playback Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-center gap-4 mb-3">
                <button
                  onClick={jumpToStart}
                  className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Jump to trim start"
                >
                  <SkipBack className="w-4 h-4 text-white" />
                </button>

                <button
                  onClick={togglePlayPause}
                  className="p-3 bg-purple-600 hover:bg-purple-500 rounded-full transition-colors shadow-lg"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-white fill-current" />
                  ) : (
                    <Play className="w-6 h-6 text-white fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={jumpToEnd}
                  className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Jump to trim end"
                >
                  <SkipForward className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Timeline */}
              <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  handleSeek(percent * duration);
                }}
              >
                {/* Trim region highlight */}
                <div
                  className="absolute h-full bg-purple-500/30"
                  style={{
                    left: `${startPercent}%`,
                    width: `${endPercent - startPercent}%`
                  }}
                />

                {/* Current time indicator */}
                <div
                  className="absolute h-full w-1 bg-white shadow-lg"
                  style={{ left: `${progressPercent}%` }}
                />

                {/* Start marker */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-green-500 cursor-ew-resize"
                  style={{ left: `${startPercent}%` }}
                />

                {/* End marker */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-red-500 cursor-ew-resize"
                  style={{ left: `${endPercent}%` }}
                />
              </div>

              {/* Time Display */}
              <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Trim Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* IN Point */}
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <label className="text-xs text-slate-400 mb-2 block flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Start Time (IN)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={startTime.toFixed(1)}
                  onChange={(e) => setStartTime(Math.max(0, Math.min(parseFloat(e.target.value) || 0, endTime - 0.1)))}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white font-mono"
                />
                <button
                  onClick={setInPoint}
                  className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-medium transition-colors"
                >
                  Set IN
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono">{formatTime(startTime)}</p>
            </div>

            {/* Duration Display */}
            <div className="p-4 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-lg border border-purple-700/30">
              <label className="text-xs text-purple-400 mb-2 block flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Trim Duration
              </label>
              <div className="text-2xl font-bold text-white font-mono mb-1">
                {formatTime(trimDuration)}
              </div>
              <p className="text-xs text-slate-400">
                {trimDuration.toFixed(1)}s of {duration.toFixed(1)}s total
              </p>
            </div>

            {/* OUT Point */}
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <label className="text-xs text-slate-400 mb-2 block flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                End Time (OUT)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={endTime.toFixed(1)}
                  onChange={(e) => setEndTime(Math.min(duration, Math.max(parseFloat(e.target.value) || 0, startTime + 0.1)))}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white font-mono"
                />
                <button
                  onClick={setOutPoint}
                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium transition-colors"
                >
                  Set OUT
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono">{formatTime(endTime)}</p>
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 bg-blue-950/30 rounded-lg border border-blue-900/40 mb-4">
            <p className="text-xs text-blue-300 font-medium mb-2">💡 Trimming Tips:</p>
            <ul className="text-[10px] text-slate-400 space-y-1">
              <li>• Click "Set IN" to mark the start of your clip at the current time</li>
              <li>• Click "Set OUT" to mark the end of your clip</li>
              <li>• Use the timeline to scrub through your video</li>
              <li>• Green marker = start, Red marker = end, White line = current time</li>
              <li>• Only the highlighted region will be used in your documentary</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleTrim}
              disabled={isTrimming || trimDuration < 0.1}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isTrimming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Use This Clip ({trimDuration.toFixed(1)}s)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoTrimmer;
