import React, { useState, useEffect } from 'react';
import { Wand2, Loader2, CheckCircle2, AlertTriangle, Lightbulb, Zap, TrendingUp } from 'lucide-react';
import { TimelineScene } from '../types';
import {
  analyzeAndRecommend,
  groupByPriority,
  applyRecommendation,
  SceneRecommendation
} from '../services/sceneRecommender';

interface AIRecommendationsPanelProps {
  timeline: TimelineScene[];
  scriptText: string;
  onApplyRecommendation: (updatedTimeline: TimelineScene[]) => void;
  onError: (msg: string) => void;
}

const AIRecommendationsPanel: React.FC<AIRecommendationsPanelProps> = ({
  timeline,
  scriptText,
  onApplyRecommendation,
  onError
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<SceneRecommendation[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);

  const analyzeTimeline = async () => {
    if (timeline.length === 0) {
      onError('No scenes to analyze. Create scenes first.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const recs = await analyzeAndRecommend(timeline, scriptText);
      setRecommendations(recs);
      setAppliedIds(new Set());

      if (recs.length === 0) {
        onError('✅ Perfect! No improvements needed - your timeline is already optimized.');
      } else {
        onError(`🎯 Found ${recs.length} suggestions to improve your video!`);
      }
    } catch (error: any) {
      onError(`Analysis failed: ${error.message}`);
      console.error('Recommendation error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyRecommendation = (rec: SceneRecommendation) => {
    const updatedTimeline = applyRecommendation(timeline, rec);
    onApplyRecommendation(updatedTimeline);

    setAppliedIds(prev => new Set([...prev, `${rec.sceneId}-${rec.type}`]));
    onError(`✅ Applied: ${rec.title}`);
  };

  const { high, medium, low } = groupByPriority(recommendations);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'medium': return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'low': return <Lightbulb className="w-4 h-4 text-blue-400" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-950/30 border-red-900/30 text-red-300';
      case 'medium': return 'bg-yellow-950/30 border-yellow-900/30 text-yellow-300';
      case 'low': return 'bg-blue-950/30 border-blue-900/30 text-blue-300';
      default: return 'bg-slate-800 border-slate-700';
    }
  };

  const RecommendationCard = ({ rec }: { rec: SceneRecommendation }) => {
    const isApplied = appliedIds.has(`${rec.sceneId}-${rec.type}`);

    return (
      <div className={`p-3 rounded-lg border ${getPriorityColor(rec.priority)}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-2 flex-1">
            {getPriorityIcon(rec.priority)}
            <div>
              <div className="text-sm font-semibold">{rec.title}</div>
              <div className="text-xs opacity-80 mt-0.5">{rec.description}</div>
            </div>
          </div>
          {isApplied ? (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded border border-green-700/30 flex-shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              Applied
            </span>
          ) : (
            <button
              onClick={() => handleApplyRecommendation(rec)}
              className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded border border-white/20 transition-all flex-shrink-0 font-medium"
            >
              Apply Fix
            </button>
          )}
        </div>

        {showDetails && (
          <div className="mt-2 pt-2 border-t border-white/10 text-[10px] opacity-70">
            <strong>Why:</strong> {rec.reason}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 bg-gradient-to-br from-indigo-950/30 to-purple-950/30 rounded-xl border border-indigo-900/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wide">
            AI Recommendations
          </h3>
        </div>
        {recommendations.length > 0 && (
          <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30">
            {recommendations.length} suggestions
          </span>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-3 leading-relaxed">
        AI-powered analysis finds pacing issues, monotonous motion, missing filters, and retention killers.
      </p>

      <button
        onClick={analyzeTimeline}
        disabled={isAnalyzing || timeline.length === 0}
        className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-lg mb-3"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing Timeline...
          </>
        ) : (
          <>
            <TrendingUp className="w-4 h-4" />
            {recommendations.length > 0 ? 'Reanalyze Timeline' : 'Analyze Timeline'}
          </>
        )}
      </button>

      {recommendations.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-slate-300">
              {high.length > 0 && `🚨 ${high.length} Critical`}
              {medium.length > 0 && ` • ⚡ ${medium.length} Medium`}
              {low.length > 0 && ` • 💡 ${low.length} Optional`}
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-[10px] text-slate-400 hover:text-white transition-colors"
            >
              {showDetails ? 'Hide details' : 'Show details'}
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {high.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  High Priority (Fix First)
                </div>
                {high.map((rec, idx) => <RecommendationCard key={idx} rec={rec} />)}
              </div>
            )}

            {medium.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Medium Priority
                </div>
                {medium.map((rec, idx) => <RecommendationCard key={idx} rec={rec} />)}
              </div>
            )}

            {low.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  Nice-to-Have
                </div>
                {low.map((rec, idx) => <RecommendationCard key={idx} rec={rec} />)}
              </div>
            )}
          </div>

          <div className="mt-3 text-[10px] text-slate-500 bg-slate-900/40 p-2 rounded">
            <strong className="text-slate-400">💡 Pro Tip:</strong> Fix high-priority issues first for maximum retention impact.
          </div>
        </>
      )}

      {recommendations.length === 0 && !isAnalyzing && (
        <div className="text-center py-6 text-slate-500 text-xs">
          <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <div>Click "Analyze Timeline" to get AI-powered suggestions</div>
        </div>
      )}
    </div>
  );
};

export default AIRecommendationsPanel;
