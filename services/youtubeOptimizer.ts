import { TimelineScene } from '../types';

/**
 * YouTube Optimization Service
 * Analyzes and optimizes video timelines for maximum viewer retention
 */

export interface PacingIssue {
  type: 'too_long' | 'too_short' | 'monotonous_motion' | 'poor_hook' | 'weak_ending';
  severity: 'warning' | 'error';
  sceneIndex?: number;
  message: string;
  suggestion: string;
}

export interface RetentionAnalysis {
  overallScore: number; // 0-100
  hookScore: number; // First 8 seconds score
  pacingScore: number; // Scene duration variety score
  engagementScore: number; // Visual variety score
  issues: PacingIssue[];
  suggestions: string[];
}

/**
 * Analyzes timeline for YouTube retention optimization
 */
export const analyzeRetention = (timeline: TimelineScene[]): RetentionAnalysis => {
  const issues: PacingIssue[] = [];
  const suggestions: string[] = [];

  if (timeline.length === 0) {
    return {
      overallScore: 0,
      hookScore: 0,
      pacingScore: 0,
      engagementScore: 0,
      issues: [],
      suggestions: ['Add scenes to your timeline']
    };
  }

  // Calculate timing metrics
  let totalDuration = 0;
  const durations: number[] = [];
  const motions: string[] = [];

  timeline.forEach((scene, idx) => {
    const duration = scene.suggested_duration_seconds || 5;
    durations.push(duration);
    totalDuration += duration;
    motions.push(scene.motion || 'static');

    // Check for overly long scenes (retention killer)
    if (duration > 12) {
      issues.push({
        type: 'too_long',
        severity: 'error',
        sceneIndex: idx,
        message: `Scene ${idx + 1} is ${duration.toFixed(1)}s (too long for YouTube)`,
        suggestion: 'Split into 2-3 shorter scenes with different angles/B-roll'
      });
    }

    // Check for very short scenes (jarring)
    if (duration < 2.5 && idx > 0) {
      issues.push({
        type: 'too_short',
        severity: 'warning',
        sceneIndex: idx,
        message: `Scene ${idx + 1} is only ${duration.toFixed(1)}s (too quick)`,
        suggestion: 'Combine with adjacent scene or extend to 3-4 seconds'
      });
    }
  });

  // Analyze hook (first 8 seconds)
  let hookDuration = 0;
  let hookScenes = 0;
  for (const scene of timeline) {
    hookDuration += scene.suggested_duration_seconds || 5;
    hookScenes++;
    if (hookDuration >= 8) break;
  }

  let hookScore = 100;
  if (hookScenes < 2) {
    hookScore = 60;
    issues.push({
      type: 'poor_hook',
      severity: 'warning',
      sceneIndex: 0,
      message: 'Opening is too slow (first scene too long)',
      suggestion: 'Hook viewers fast: Use 2-3 quick scenes (3-4s each) in first 8 seconds'
    });
  } else if (hookScenes > 4) {
    hookScore = 70;
    issues.push({
      type: 'poor_hook',
      severity: 'warning',
      sceneIndex: 0,
      message: 'Opening is too chaotic (too many quick cuts)',
      suggestion: 'Reduce to 2-3 scenes in first 8 seconds for clarity'
    });
  }

  // Analyze pacing variety
  const avgDuration = totalDuration / timeline.length;
  const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / timeline.length;
  const stdDev = Math.sqrt(variance);

  let pacingScore = 100;
  if (stdDev < 1.0) {
    pacingScore = 65;
    issues.push({
      type: 'monotonous_motion',
      severity: 'warning',
      message: 'All scenes have similar duration (monotonous pacing)',
      suggestion: 'Vary scene lengths: Use 4-6s for action, 8-10s for context, 3-5s for impact'
    });
  }

  // Check for monotonous camera movement
  const motionCounts: Record<string, number> = {};
  motions.forEach(m => {
    motionCounts[m] = (motionCounts[m] || 0) + 1;
  });

  const dominantMotion = Object.entries(motionCounts).reduce((a, b) => a[1] > b[1] ? a : b);
  let engagementScore = 100;

  if (dominantMotion[1] / timeline.length > 0.6) {
    engagementScore = 70;
    issues.push({
      type: 'monotonous_motion',
      severity: 'warning',
      message: `${dominantMotion[1]} scenes use "${dominantMotion[0]}" motion (repetitive)`,
      suggestion: 'Mix camera movements: Combine zooms, pans, and static shots for variety'
    });
  }

  // Check ending
  const lastScene = timeline[timeline.length - 1];
  const lastDuration = lastScene.suggested_duration_seconds || 5;
  if (lastDuration < 3) {
    issues.push({
      type: 'weak_ending',
      severity: 'warning',
      sceneIndex: timeline.length - 1,
      message: 'Ending scene is too short (abrupt)',
      suggestion: 'Extend final scene to 5-8s for satisfying conclusion'
    });
  }

  // Generate overall suggestions
  if (avgDuration > 10) {
    suggestions.push('⚡ Average scene is too long. Aim for 6-8s average for better retention.');
  }

  if (avgDuration < 5) {
    suggestions.push('🎬 Scenes are too short. Viewers need time to absorb visuals (6-8s ideal).');
  }

  if (timeline.length > 40) {
    suggestions.push('📊 Too many scenes. Combine related content for better flow.');
  }

  if (timeline.length < 8 && totalDuration > 60) {
    suggestions.push('✂️ Too few scenes. Add variety with different angles and B-roll.');
  }

  // Calculate overall score
  const overallScore = Math.round((hookScore + pacingScore + engagementScore) / 3);

  return {
    overallScore,
    hookScore,
    pacingScore,
    engagementScore,
    issues,
    suggestions
  };
};

/**
 * Auto-fix common pacing issues
 */
export const autoOptimizePacing = (timeline: TimelineScene[]): TimelineScene[] => {
  const optimized = [...timeline];

  // Split overly long scenes
  const toSplit: number[] = [];
  optimized.forEach((scene, idx) => {
    if ((scene.suggested_duration_seconds || 5) > 12) {
      toSplit.push(idx);
    }
  });

  // Split from end to preserve indices
  toSplit.reverse().forEach(idx => {
    const scene = optimized[idx];
    const duration = scene.suggested_duration_seconds || 12;
    const halfDuration = duration / 2;

    // Split script text roughly in half
    const words = scene.script_excerpt?.split(' ') || [];
    const midPoint = Math.floor(words.length / 2);
    const firstHalf = words.slice(0, midPoint).join(' ');
    const secondHalf = words.slice(midPoint).join(' ');

    // Create two scenes
    optimized.splice(idx, 1,
      {
        ...scene,
        scene_id: `${scene.scene_id}_a`,
        script_excerpt: firstHalf,
        suggested_duration_seconds: Number(halfDuration.toFixed(1)),
        motion: scene.motion || 'slow_zoom_in'
      },
      {
        ...scene,
        scene_id: `${scene.scene_id}_b`,
        script_excerpt: secondHalf,
        suggested_duration_seconds: Number(halfDuration.toFixed(1)),
        motion: scene.motion === 'slow_zoom_in' ? 'slow_zoom_out' : 'slow_zoom_in' // Vary motion
      }
    );
  });

  return optimized;
};

/**
 * Calculate ideal scene duration based on narration
 */
export const calculateIdealDuration = (scriptText: string): number => {
  const wordCount = scriptText.trim().split(/\s+/).filter(w => w.length > 0).length;

  // Speaking rate: 2.5 words/second average
  // Add padding: +1.5s for breathing room
  const baseDuration = (wordCount / 2.5) + 1.5;

  // Clamp to YouTube-friendly range
  return Math.max(4, Math.min(12, baseDuration));
};
