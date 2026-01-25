import { TimelineScene } from '../types';
import { GoogleGenAI } from "@google/genai";

/**
 * INTELLIGENT SCENE RECOMMENDER
 * AI-powered suggestions for improving visual storytelling
 */

export interface SceneRecommendation {
  sceneId: string | number;
  type: 'motion' | 'filter' | 'transition' | 'b-roll' | 'text-overlay' | 'pacing';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestedValue?: any;
  reason: string;
}

/**
 * Analyze scenes and generate AI recommendations
 */
export const analyzeAndRecommend = async (
  timeline: TimelineScene[],
  scriptText: string
): Promise<SceneRecommendation[]> => {
  const recommendations: SceneRecommendation[] = [];

  // Quick rule-based recommendations (instant)
  recommendations.push(...getRuleBasedRecommendations(timeline));

  // AI-powered recommendations (slower, more intelligent)
  if (process.env.API_KEY && scriptText) {
    try {
      const aiRecs = await getAIRecommendations(timeline, scriptText);
      recommendations.push(...aiRecs);
    } catch (error) {
      console.warn('AI recommendations failed, using rule-based only:', error);
    }
  }

  return recommendations;
};

/**
 * Fast rule-based recommendations
 */
const getRuleBasedRecommendations = (timeline: TimelineScene[]): SceneRecommendation[] => {
  const recs: SceneRecommendation[] = [];

  timeline.forEach((scene, idx) => {
    const duration = scene.suggested_duration_seconds || 5;
    const motion = scene.motion || 'static';
    const filter = scene.filter || 'none';

    // Check for boring static scenes
    if (motion === 'static' && duration > 8) {
      recs.push({
        sceneId: scene.scene_id,
        type: 'motion',
        priority: 'medium',
        title: 'Add Camera Movement',
        description: `Scene ${idx + 1} is static for ${duration.toFixed(1)}s`,
        suggestedValue: 'slow_zoom_in',
        reason: 'Static scenes over 8s can feel stagnant. Adding subtle motion improves engagement.'
      });
    }

    // Check for monotonous motion
    if (idx > 0) {
      const prevScene = timeline[idx - 1];
      const prevMotion = prevScene.motion || 'static';

      if (motion === prevMotion && idx > 1) {
        const prevPrevMotion = timeline[idx - 2]?.motion || 'static';
        if (motion === prevPrevMotion) {
          recs.push({
            sceneId: scene.scene_id,
            type: 'motion',
            priority: 'medium',
            title: 'Vary Camera Movement',
            description: `3 consecutive scenes use "${motion}"`,
            suggestedValue: motion === 'slow_zoom_in' ? 'pan_right' : 'slow_zoom_in',
            reason: 'Repetitive camera movements feel monotonous. Mix zoom, pan, and static shots.'
          });
        }
      }
    }

    // Suggest filters for emotional moments
    if (filter === 'none' && scene.script_excerpt) {
      const excerpt = scene.script_excerpt.toLowerCase();

      if (excerpt.includes('nostalgia') || excerpt.includes('remember') || excerpt.includes('back then')) {
        recs.push({
          sceneId: scene.scene_id,
          type: 'filter',
          priority: 'low',
          title: 'Add Nostalgic Filter',
          description: 'Script mentions nostalgia/memories',
          suggestedValue: 'vintage',
          reason: 'Vintage filter enhances nostalgic storytelling with warm, retro tones.'
        });
      }

      if (excerpt.includes('dark') || excerpt.includes('decline') || excerpt.includes('ended')) {
        recs.push({
          sceneId: scene.scene_id,
          type: 'filter',
          priority: 'low',
          title: 'Add Dramatic Filter',
          description: 'Script has somber tone',
          suggestedValue: 'dramatic',
          reason: 'Dramatic filter adds mood with higher contrast and darker tones.'
        });
      }
    }

    // Check for abrupt transitions
    if (scene.transition_to_next === 'cut' && duration > 10) {
      recs.push({
        sceneId: scene.scene_id,
        type: 'transition',
        priority: 'low',
        title: 'Soften Transition',
        description: 'Hard cut after long scene feels jarring',
        suggestedValue: 'crossfade',
        reason: 'Crossfade transitions provide smoother flow between long scenes.'
      });
    }

    // Suggest text overlays for key moments
    if (!scene.overlay_text && idx === 0) {
      recs.push({
        sceneId: scene.scene_id,
        type: 'text-overlay',
        priority: 'medium',
        title: 'Add Title Card',
        description: 'First scene should have title',
        suggestedValue: scene.scene_summary || 'Documentary Title',
        reason: 'Opening title cards improve viewer engagement and set expectations.'
      });
    }

    // Pacing recommendations
    if (duration < 3 && idx > 0) {
      recs.push({
        sceneId: scene.scene_id,
        type: 'pacing',
        priority: 'high',
        title: 'Extend Scene Duration',
        description: `Scene ${idx + 1} is only ${duration.toFixed(1)}s`,
        suggestedValue: 4.0,
        reason: 'Scenes under 3 seconds are too quick for viewers to absorb visuals.'
      });
    }

    if (duration > 15) {
      recs.push({
        sceneId: scene.scene_id,
        type: 'pacing',
        priority: 'high',
        title: 'Split Long Scene',
        description: `Scene ${idx + 1} is ${duration.toFixed(1)}s (too long)`,
        suggestedValue: duration / 2,
        reason: 'Scenes over 15s hurt retention. Split with different angles or B-roll.'
      });
    }

    // B-roll suggestions
    if (scene.selected_images.length === 1 && duration > 8) {
      recs.push({
        sceneId: scene.scene_id,
        type: 'b-roll',
        priority: 'medium',
        title: 'Add B-Roll Footage',
        description: `Single image for ${duration.toFixed(1)}s`,
        suggestedValue: 2, // Suggest 2 images
        reason: 'Long scenes benefit from multiple angles. Add B-roll to maintain visual interest.'
      });
    }
  });

  return recs;
};

/**
 * AI-powered recommendations using Gemini
 */
const getAIRecommendations = async (
  timeline: TimelineScene[],
  scriptText: string
): Promise<SceneRecommendation[]> => {
  if (!process.env.API_KEY) return [];

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const scenesSummary = timeline.map((s, idx) => ({
    index: idx + 1,
    id: s.scene_id,
    duration: s.suggested_duration_seconds || 5,
    motion: s.motion,
    filter: s.filter || 'none',
    excerpt: s.script_excerpt?.substring(0, 100) || ''
  }));

  const prompt = `You are a professional documentary editor analyzing a video timeline for improvement opportunities.

SCRIPT CONTEXT:
${scriptText.substring(0, 1000)}...

TIMELINE SCENES:
${JSON.stringify(scenesSummary, null, 2)}

Analyze this timeline and suggest 3-5 HIGH-VALUE improvements that would significantly enhance storytelling, emotional impact, or viewer retention.

Focus on:
1. **Emotional beats**: Where filters/text overlays would enhance impact
2. **Visual variety**: Where camera motion or B-roll would help
3. **Pacing issues**: Scenes that feel too long/short given content
4. **Story flow**: Transitions that could be smoother

Return a JSON array of recommendations:
[
  {
    "sceneId": "scene-1",
    "type": "filter",
    "priority": "high",
    "title": "Add Vintage Filter",
    "description": "Nostalgia narrative at 0:15",
    "suggestedValue": "vintage",
    "reason": "Script discusses '90s memories - vintage filter enhances nostalgic mood"
  }
]

Types: "motion", "filter", "transition", "b-roll", "text-overlay", "pacing"
Priority: "low", "medium", "high"

Return ONLY the JSON array, no markdown.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "[]";
    const cleanedText = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const aiRecs = JSON.parse(cleanedText);

    return aiRecs.map((rec: any) => ({
      sceneId: rec.sceneId,
      type: rec.type || 'motion',
      priority: rec.priority || 'medium',
      title: rec.title || 'Improve Scene',
      description: rec.description || '',
      suggestedValue: rec.suggestedValue,
      reason: rec.reason || ''
    }));

  } catch (error) {
    console.error('AI recommendations error:', error);
    return [];
  }
};

/**
 * Group recommendations by priority
 */
export const groupByPriority = (recommendations: SceneRecommendation[]): {
  high: SceneRecommendation[];
  medium: SceneRecommendation[];
  low: SceneRecommendation[];
} => {
  return {
    high: recommendations.filter(r => r.priority === 'high'),
    medium: recommendations.filter(r => r.priority === 'medium'),
    low: recommendations.filter(r => r.priority === 'low')
  };
};

/**
 * Apply a recommendation to timeline
 */
export const applyRecommendation = (
  timeline: TimelineScene[],
  recommendation: SceneRecommendation
): TimelineScene[] => {
  return timeline.map(scene => {
    if (scene.scene_id !== recommendation.sceneId) return scene;

    const updated = { ...scene };

    switch (recommendation.type) {
      case 'motion':
        updated.motion = recommendation.suggestedValue || 'slow_zoom_in';
        break;

      case 'filter':
        updated.filter = recommendation.suggestedValue || 'cinematic';
        break;

      case 'transition':
        updated.transition_to_next = recommendation.suggestedValue || 'crossfade';
        break;

      case 'text-overlay':
        updated.overlay_text = recommendation.suggestedValue || '';
        break;

      case 'pacing':
        updated.suggested_duration_seconds = recommendation.suggestedValue || 5;
        break;

      case 'b-roll':
        // B-roll requires manual image selection
        // Just flag it for user
        break;
    }

    return updated;
  });
};

/**
 * Auto-apply safe recommendations (non-destructive)
 */
export const autoApplySafeRecommendations = (
  timeline: TimelineScene[],
  recommendations: SceneRecommendation[]
): TimelineScene[] => {
  let updated = [...timeline];

  // Only auto-apply low-risk improvements
  const safeRecs = recommendations.filter(r =>
    r.type === 'filter' ||
    r.type === 'transition' ||
    (r.type === 'motion' && r.priority !== 'high')
  );

  for (const rec of safeRecs) {
    updated = applyRecommendation(updated, rec);
  }

  return updated;
};
