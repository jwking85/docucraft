import React, { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2, Zap, Eye } from 'lucide-react';
import { TimelineScene } from '../types';
import { analyzeRetention, RetentionAnalysis } from '../services/youtubeOptimizer';

interface RetentionScoreDisplayProps {
  timeline: TimelineScene[];
}

const RetentionScoreDisplay: React.FC<RetentionScoreDisplayProps> = ({ timeline }) => {
  const [analysis, setAnalysis] = useState<RetentionAnalysis | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (timeline.length > 0) {
      const result = analyzeRetention(timeline);
      setAnalysis(result);
    } else {
      setAnalysis(null);
    }
  }, [timeline]);

  if (!analysis) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-600 to-emerald-600';
    if (score >= 60) return 'from-yellow-600 to-orange-600';
    return 'from-red-600 to-rose-600';
  };

  const ScoreCircle = ({ score, label }: { score: number; label: string }) => (
    <div className="text-center">
      <div className={`relative w-16 h-16 mx-auto mb-2`}>
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-slate-700"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 28}`}
            strokeDashoffset={`${2 * Math.PI * 28 * (1 - score / 100)}`}
            className={getScoreColor(score)}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${getScoreColor(score)}`}>
            {score}
          </span>
        </div>
      </div>
      <div className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</div>
    </div>
  );

  return (
    <div className="p-4 bg-gradient-to-br from-emerald-950/30 to-teal-950/30 rounded-xl border border-emerald-900/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wide">
            YouTube Retention Score
          </h3>
        </div>
        <div className={`text-2xl font-bold ${getScoreColor(analysis.overallScore)}`}>
          {analysis.overallScore}/100
        </div>
      </div>

      {/* Overall Score Bar */}
      <div className="mb-4">
        <div className="h-3 bg-slate-900 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getScoreGradient(analysis.overallScore)} transition-all duration-500`}
            style={{ width: `${analysis.overallScore}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-slate-400 text-center">
          {analysis.overallScore >= 80 && '🎉 Excellent! YouTube algorithm will love this'}
          {analysis.overallScore >= 60 && analysis.overallScore < 80 && '👍 Good retention - minor improvements possible'}
          {analysis.overallScore < 60 && '⚠️ Needs work - fix high-priority issues first'}
        </div>
      </div>

      {/* Detailed Scores */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <ScoreCircle score={analysis.hookScore} label="Hook" />
        <ScoreCircle score={analysis.pacingScore} label="Pacing" />
        <ScoreCircle score={analysis.engagementScore} label="Engagement" />
      </div>

      {/* Issues Summary */}
      {analysis.issues.length > 0 && (
        <div className="mb-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
              {analysis.issues.length} Issue{analysis.issues.length !== 1 ? 's' : ''} Found
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-[10px] text-slate-400 hover:text-white transition-colors"
            >
              {showDetails ? 'Hide' : 'Show'} details
            </button>
          </div>

          {showDetails && (
            <div className="space-y-2 mt-2">
              {analysis.issues.slice(0, 5).map((issue, idx) => (
                <div
                  key={idx}
                  className={`text-xs p-2 rounded border ${
                    issue.severity === 'error'
                      ? 'bg-red-950/30 border-red-900/30 text-red-300'
                      : 'bg-yellow-950/30 border-yellow-900/30 text-yellow-300'
                  }`}
                >
                  <div className="font-semibold mb-0.5">{issue.message}</div>
                  <div className="text-[10px] opacity-80">{issue.suggestion}</div>
                </div>
              ))}
              {analysis.issues.length > 5 && (
                <div className="text-[10px] text-slate-500 text-center">
                  ... and {analysis.issues.length - 5} more issues
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Suggestions */}
      {analysis.suggestions.length > 0 && (
        <div className="space-y-1.5">
          {analysis.suggestions.map((suggestion, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-slate-400">
              <Zap className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />
              <span>{suggestion}</span>
            </div>
          ))}
        </div>
      )}

      {analysis.issues.length === 0 && analysis.overallScore >= 80 && (
        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/20 p-3 rounded border border-green-900/30">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Perfect! Your timeline is optimized for maximum retention.</span>
        </div>
      )}

      {/* What This Means */}
      <div className="mt-4 p-3 bg-slate-900/40 rounded-lg text-[10px] text-slate-500">
        <div className="font-semibold text-slate-400 mb-2 flex items-center gap-1">
          <Eye className="w-3 h-3" />
          What this means:
        </div>
        <div className="space-y-1">
          <div><strong className="text-slate-400">Hook Score:</strong> How well first 8 seconds grab attention</div>
          <div><strong className="text-slate-400">Pacing Score:</strong> Scene duration variety prevents monotony</div>
          <div><strong className="text-slate-400">Engagement:</strong> Visual variety with camera movement</div>
        </div>
      </div>
    </div>
  );
};

export default RetentionScoreDisplay;
