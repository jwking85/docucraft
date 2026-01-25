import { TimelineScene } from '../types';

/**
 * ADVANCED TEMPLATE SYSTEM
 * Professional documentary templates for different storytelling styles
 */

export interface DocumentaryTemplate {
  id: string;
  name: string;
  category: 'historical' | 'true-crime' | 'nature' | 'biographical' | 'investigative' | 'nostalgia';
  description: string;
  icon: string;
  style: {
    defaultFilter: string;
    defaultMotion: string;
    defaultTransition: string;
    pacing: 'slow' | 'medium' | 'fast';
    textStyle: 'elegant' | 'bold' | 'minimal' | 'vintage';
  };
  musicRecommendations: string[];
  visualGuidelines: string[];
  exampleUse: string;
}

export const DOCUMENTARY_TEMPLATES: DocumentaryTemplate[] = [
  {
    id: 'historical-epic',
    name: 'Historical Epic',
    category: 'historical',
    description: 'Grand, cinematic style for historical events',
    icon: '🏛️',
    style: {
      defaultFilter: 'cinematic',
      defaultMotion: 'slow_zoom_out',
      defaultTransition: 'crossfade',
      pacing: 'slow',
      textStyle: 'elegant'
    },
    musicRecommendations: [
      'Orchestral scores',
      'Epic cinematic themes',
      'Period-appropriate music'
    ],
    visualGuidelines: [
      'Use slow, deliberate camera movements',
      'Long scene durations (8-12s)',
      'Vintage filters for historical authenticity',
      'Title cards for dates and locations',
      'Crossfades for smooth transitions'
    ],
    exampleUse: 'WWii documentaries, ancient civilizations, historical figures'
  },
  {
    id: 'true-crime-thriller',
    name: 'True Crime Thriller',
    category: 'true-crime',
    description: 'Dark, suspenseful style for crime stories',
    icon: '🔍',
    style: {
      defaultFilter: 'dramatic',
      defaultMotion: 'slow_zoom_in',
      defaultTransition: 'cut',
      pacing: 'medium',
      textStyle: 'bold'
    },
    musicRecommendations: [
      'Dark ambient',
      'Suspenseful strings',
      'Minimal piano'
    ],
    visualGuidelines: [
      'Use dramatic lighting and high contrast',
      'Quick cuts (4-6s) for tension',
      'Zoom in on evidence/details',
      'Dark color grading',
      'Text overlays for timestamps and locations'
    ],
    exampleUse: 'Murder mysteries, investigations, cold cases'
  },
  {
    id: 'nostalgia-journey',
    name: 'Nostalgia Journey',
    category: 'nostalgia',
    description: 'Warm, sentimental style for retrospectives',
    icon: '📼',
    style: {
      defaultFilter: 'vintage',
      defaultMotion: 'slow_zoom_in',
      defaultTransition: 'crossfade',
      pacing: 'slow',
      textStyle: 'vintage'
    },
    musicRecommendations: [
      'Retro synth',
      'Era-appropriate pop',
      'Soft acoustic'
    ],
    visualGuidelines: [
      'Vintage/sepia filters throughout',
      'Slow pacing (8-10s scenes)',
      'Gentle camera movements',
      'Warm color grading',
      'Period-specific imagery'
    ],
    exampleUse: '90s nostalgia, company histories, cultural retrospectives'
  },
  {
    id: 'nature-majestic',
    name: 'Nature Majestic',
    category: 'nature',
    description: 'Breathtaking style for wildlife and landscapes',
    icon: '🌍',
    style: {
      defaultFilter: 'cinematic',
      defaultMotion: 'pan_right',
      defaultTransition: 'crossfade',
      pacing: 'slow',
      textStyle: 'elegant'
    },
    musicRecommendations: [
      'Ambient soundscapes',
      'Orchestral nature themes',
      'Minimal piano'
    ],
    visualGuidelines: [
      'Sweeping pans for landscapes',
      'Long durations (10-15s) to absorb beauty',
      'Vibrant, saturated colors',
      'Minimal text overlays',
      'Let visuals breathe'
    ],
    exampleUse: 'Wildlife documentaries, planet earth style, environmental stories'
  },
  {
    id: 'fast-paced-modern',
    name: 'Fast-Paced Modern',
    category: 'investigative',
    description: 'Dynamic, energetic style for modern topics',
    icon: '⚡',
    style: {
      defaultFilter: 'none',
      defaultMotion: 'slow_zoom_in',
      defaultTransition: 'cut',
      pacing: 'fast',
      textStyle: 'bold'
    },
    musicRecommendations: [
      'Electronic beats',
      'Upbeat corporate',
      'Modern pop'
    ],
    visualGuidelines: [
      'Quick cuts (3-5s scenes)',
      'Dynamic camera movements',
      'Bold text overlays',
      'Modern, clean aesthetics',
      'High energy throughout'
    ],
    exampleUse: 'Tech documentaries, social media stories, startup profiles'
  },
  {
    id: 'biographical-intimate',
    name: 'Biographical Intimate',
    category: 'biographical',
    description: 'Personal, emotional style for life stories',
    icon: '👤',
    style: {
      defaultFilter: 'warm',
      defaultMotion: 'slow_zoom_in',
      defaultTransition: 'crossfade',
      pacing: 'medium',
      textStyle: 'minimal'
    },
    musicRecommendations: [
      'Emotional piano',
      'Acoustic guitar',
      'Soft strings'
    ],
    visualGuidelines: [
      'Focus on faces and personal items',
      'Zoom in for intimacy',
      'Warm color grading',
      'Medium pacing (6-8s)',
      'Quotes as text overlays'
    ],
    exampleUse: 'Celebrity biographies, personal memoirs, tribute videos'
  },
  {
    id: 'youtube-explainer',
    name: 'YouTube Explainer',
    category: 'investigative',
    description: 'Engaging style optimized for YouTube algorithm',
    icon: '📺',
    style: {
      defaultFilter: 'none',
      defaultMotion: 'slow_zoom_in',
      defaultTransition: 'cut',
      pacing: 'fast',
      textStyle: 'bold'
    },
    musicRecommendations: [
      'Upbeat background music',
      'Royalty-free pop',
      'Energetic instrumentals'
    ],
    visualGuidelines: [
      'Hook in first 8 seconds',
      'Fast cuts (4-6s) for retention',
      'Bold text overlays throughout',
      'Vary camera movements',
      'End with call-to-action'
    ],
    exampleUse: 'YouTube documentaries, educational content, video essays'
  }
];

/**
 * Apply template styling to entire timeline
 */
export const applyTemplate = (
  timeline: TimelineScene[],
  templateId: string
): TimelineScene[] => {
  const template = DOCUMENTARY_TEMPLATES.find(t => t.id === templateId);
  if (!template) return timeline;

  return timeline.map((scene, idx) => {
    const updated = { ...scene };

    // Apply filter
    if (!scene.filter || scene.filter === 'none') {
      updated.filter = template.style.defaultFilter as any;
    }

    // Apply motion (vary slightly for interest)
    if (template.style.defaultMotion === 'slow_zoom_in') {
      // Alternate zoom in/out occasionally
      updated.motion = idx % 4 === 0 ? 'slow_zoom_out' : 'slow_zoom_in';
    } else if (template.style.defaultMotion === 'pan_right') {
      // Alternate pan directions
      updated.motion = idx % 2 === 0 ? 'pan_right' : 'pan_left';
    } else {
      updated.motion = template.style.defaultMotion;
    }

    // Apply transition
    updated.transition_to_next = template.style.defaultTransition as any;

    // Adjust duration based on pacing
    const currentDuration = scene.suggested_duration_seconds || 8;
    switch (template.style.pacing) {
      case 'slow':
        updated.suggested_duration_seconds = Math.max(8, currentDuration);
        break;
      case 'fast':
        updated.suggested_duration_seconds = Math.min(6, currentDuration);
        break;
      case 'medium':
        updated.suggested_duration_seconds = currentDuration;
        break;
    }

    // Apply text style
    updated.textStyle = template.style.textStyle;

    return updated;
  });
};

/**
 * Get template recommendations based on script content
 */
export const recommendTemplate = (scriptText: string): DocumentaryTemplate => {
  const lowerScript = scriptText.toLowerCase();

  // Analyze script content for keywords
  const keywords = {
    historical: ['history', 'ancient', 'century', 'war', 'empire', 'civilization'],
    trueCrime: ['murder', 'crime', 'investigation', 'detective', 'mystery', 'victim'],
    nostalgia: ['nostalgia', '90s', '80s', 'remember', 'childhood', 'grew up'],
    nature: ['wildlife', 'nature', 'animal', 'planet', 'ocean', 'forest'],
    biographical: ['life', 'born', 'career', 'personal', 'journey', 'story of'],
    investigative: ['uncovered', 'revealed', 'investigation', 'truth', 'expose']
  };

  let maxScore = 0;
  let bestCategory: keyof typeof keywords = 'nostalgia';

  // Count keyword matches
  for (const [category, words] of Object.entries(keywords)) {
    const score = words.filter(word => lowerScript.includes(word)).length;
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category as keyof typeof keywords;
    }
  }

  // Map category to template
  const categoryToTemplate: Record<string, string> = {
    historical: 'historical-epic',
    trueCrime: 'true-crime-thriller',
    nostalgia: 'nostalgia-journey',
    nature: 'nature-majestic',
    biographical: 'biographical-intimate',
    investigative: 'fast-paced-modern'
  };

  const templateId = categoryToTemplate[bestCategory] || 'youtube-explainer';
  return DOCUMENTARY_TEMPLATES.find(t => t.id === templateId)!;
};

/**
 * Get template by ID
 */
export const getTemplate = (id: string): DocumentaryTemplate | undefined => {
  return DOCUMENTARY_TEMPLATES.find(t => t.id === id);
};

/**
 * Preview what template will do to timeline (without applying)
 */
export const previewTemplate = (template: DocumentaryTemplate): {
  filters: string;
  motions: string;
  transitions: string;
  pacing: string;
  overall: string;
} => {
  return {
    filters: `Applies "${template.style.defaultFilter}" filter throughout`,
    motions: `Uses "${template.style.defaultMotion}" camera movement`,
    transitions: `${template.style.defaultTransition} transitions between scenes`,
    pacing: `${template.style.pacing === 'fast' ? 'Quick cuts (4-6s)' :
             template.style.pacing === 'slow' ? 'Slow, deliberate (8-12s)' :
             'Balanced pacing (6-8s)'}`,
    overall: template.description
  };
};
