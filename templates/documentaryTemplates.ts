/**
 * Documentary Templates for YouTubers
 * Pre-configured styles for different documentary types
 */

export interface DocumentaryTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  settings: {
    defaultFilter: string;
    defaultMotion: string;
    defaultTransition: string;
    kenBurnsEnabled: boolean;
    kenBurnsDirection: string;
    sceneDuration: number;
    colorPalette: string[];
  };
  musicRecommendations: string[];
  tips: string[];
}

export const DOCUMENTARY_TEMPLATES: DocumentaryTemplate[] = [
  {
    id: 'historical',
    name: 'Historical Documentary',
    description: 'Perfect for history, wars, biographies, and vintage stories',
    icon: '📜',
    settings: {
      defaultFilter: 'cinematic',
      defaultMotion: 'slow_zoom_in',
      defaultTransition: 'crossfade',
      kenBurnsEnabled: true,
      kenBurnsDirection: 'zoom-in',
      sceneDuration: 10,
      colorPalette: ['warm', 'vintage', 'cinematic']
    },
    musicRecommendations: ['Epic orchestral', 'Dramatic strings', 'Nostalgic piano'],
    tips: [
      'Use Ken Burns on all archival photos',
      'Apply warm or vintage filters',
      'Longer scenes (10-12s) for reflection',
      'Lower-third text for dates and names',
      'Crossfade transitions for smooth flow'
    ]
  },
  {
    id: 'nature',
    name: 'Nature Documentary',
    description: 'Wildlife, landscapes, planet Earth style content',
    icon: '🌿',
    settings: {
      defaultFilter: 'cinematic',
      defaultMotion: 'pan_right',
      defaultTransition: 'crossfade',
      kenBurnsEnabled: true,
      kenBurnsDirection: 'pan-right',
      sceneDuration: 12,
      colorPalette: ['cinematic', 'warm', 'none']
    },
    musicRecommendations: ['Calm ambient', 'Uplifting strings', 'Nature sounds'],
    tips: [
      'Pan left/right for landscapes',
      'Slow zoom for animal close-ups',
      'Warm filter for golden hour feel',
      'Longer scenes (12-15s) to breathe',
      'Minimal text overlays'
    ]
  },
  {
    id: 'true-crime',
    name: 'True Crime',
    description: 'Mystery, investigation, crime stories',
    icon: '🔍',
    settings: {
      defaultFilter: 'dramatic',
      defaultMotion: 'slow_zoom_in',
      defaultTransition: 'wipe-right',
      kenBurnsEnabled: true,
      kenBurnsDirection: 'zoom-in',
      sceneDuration: 8,
      colorPalette: ['dramatic', 'noir', 'cool']
    },
    musicRecommendations: ['Dark ambient', 'Mysterious tension', 'Suspenseful'],
    tips: [
      'Dramatic or noir filters',
      'Zoom in for tension building',
      'Wipe transitions for location changes',
      'Shorter scenes (8-10s) for pacing',
      'Lower-thirds for suspect info'
    ]
  },
  {
    id: 'educational',
    name: 'Educational/Explainer',
    description: 'Science, technology, how-to, tutorials',
    icon: '🎓',
    settings: {
      defaultFilter: 'none',
      defaultMotion: 'static',
      defaultTransition: 'cut',
      kenBurnsEnabled: false,
      kenBurnsDirection: 'zoom-in',
      sceneDuration: 8,
      colorPalette: ['none', 'cool', 'cinematic']
    },
    musicRecommendations: ['Upbeat electronic', 'Modern pop', 'Light background'],
    tips: [
      'Clean, no filter for clarity',
      'Static or slow zoom for diagrams',
      'Quick cuts for energy',
      'Text overlays for key points',
      'Shorter scenes (6-8s) for engagement'
    ]
  },
  {
    id: 'travel',
    name: 'Travel Documentary',
    description: 'Cities, cultures, adventures, vlogs',
    icon: '✈️',
    settings: {
      defaultFilter: 'warm',
      defaultMotion: 'pan_left',
      defaultTransition: 'slide-left',
      kenBurnsEnabled: true,
      kenBurnsDirection: 'pan-left',
      sceneDuration: 10,
      colorPalette: ['warm', 'cinematic', 'vintage']
    },
    musicRecommendations: ['Uplifting folk', 'World music', 'Adventure themes'],
    tips: [
      'Warm filter for inviting feel',
      'Pan for cityscapes and landscapes',
      'Slide transitions for location changes',
      'Medium scenes (10s) for exploration',
      'Location names as lower-thirds'
    ]
  },
  {
    id: 'sports',
    name: 'Sports Documentary',
    description: 'Athletes, competitions, rivalries',
    icon: '⚽',
    settings: {
      defaultFilter: 'cinematic',
      defaultMotion: 'slow_zoom_out',
      defaultTransition: 'zoom-in',
      kenBurnsEnabled: true,
      kenBurnsDirection: 'zoom-out',
      sceneDuration: 7,
      colorPalette: ['cinematic', 'dramatic', 'none']
    },
    musicRecommendations: ['Epic sports anthems', 'Motivational rock', 'Energetic beats'],
    tips: [
      'High contrast cinematic filter',
      'Zoom out for reveals',
      'Dynamic transitions',
      'Fast pacing (7-9s scenes)',
      'Bold text overlays for stats'
    ]
  },
  {
    id: 'biography',
    name: 'Biography/Profile',
    description: 'Life stories, celebrity profiles, memoirs',
    icon: '👤',
    settings: {
      defaultFilter: 'vintage',
      defaultMotion: 'slow_zoom_in',
      defaultTransition: 'crossfade',
      kenBurnsEnabled: true,
      kenBurnsDirection: 'zoom-in',
      sceneDuration: 11,
      colorPalette: ['vintage', 'warm', 'cinematic']
    },
    musicRecommendations: ['Emotional piano', 'Nostalgic strings', 'Reflective ambient'],
    tips: [
      'Vintage or warm for nostalgia',
      'Zoom in on portraits',
      'Gentle crossfades',
      'Longer scenes (11-13s) for storytelling',
      'Timeline lower-thirds with dates'
    ]
  },
  {
    id: 'short-form',
    name: 'YouTube Shorts/TikTok',
    description: 'Vertical, fast-paced, under 60 seconds',
    icon: '📱',
    settings: {
      defaultFilter: 'dramatic',
      defaultMotion: 'slow_zoom_in',
      defaultTransition: 'cut',
      kenBurnsEnabled: true,
      kenBurnsDirection: 'zoom-in',
      sceneDuration: 4,
      colorPalette: ['dramatic', 'cinematic', 'warm']
    },
    musicRecommendations: ['Trending TikTok sounds', 'High-energy beats', 'Viral hooks'],
    tips: [
      'FAST pacing (3-5s scenes)',
      'Quick cuts for energy',
      'Vertical export (1080x1920)',
      'Bold, large text overlays',
      'Hook in first 3 seconds'
    ]
  }
];

/**
 * Apply a template to a timeline
 */
export const applyTemplateToTimeline = (timeline: any[], template: DocumentaryTemplate): any[] => {
  return timeline.map(scene => ({
    ...scene,
    filter: template.settings.defaultFilter,
    motion: template.settings.defaultMotion,
    transition_to_next: template.settings.defaultTransition,
    kenBurns: template.settings.kenBurnsEnabled,
    kenBurnsDirection: template.settings.kenBurnsDirection,
    suggested_duration_seconds: template.settings.sceneDuration
  }));
};

/**
 * Get template recommendations based on script content
 */
export const recommendTemplate = (scriptContent: string): DocumentaryTemplate => {
  const content = scriptContent.toLowerCase();

  // True Crime
  if (content.includes('murder') || content.includes('crime') || content.includes('investigation') || content.includes('mystery')) {
    return DOCUMENTARY_TEMPLATES[2]; // true-crime
  }

  // Nature
  if (content.includes('wildlife') || content.includes('nature') || content.includes('earth') || content.includes('animal')) {
    return DOCUMENTARY_TEMPLATES[1]; // nature
  }

  // Sports
  if (content.includes('athlete') || content.includes('championship') || content.includes('sport') || content.includes('game')) {
    return DOCUMENTARY_TEMPLATES[5]; // sports
  }

  // Educational
  if (content.includes('how to') || content.includes('tutorial') || content.includes('science') || content.includes('explain')) {
    return DOCUMENTARY_TEMPLATES[3]; // educational
  }

  // Travel
  if (content.includes('travel') || content.includes('city') || content.includes('journey') || content.includes('explore')) {
    return DOCUMENTARY_TEMPLATES[4]; // travel
  }

  // Biography
  if (content.includes('born in') || content.includes('life of') || content.includes('biography') || content.includes('story of')) {
    return DOCUMENTARY_TEMPLATES[6]; // biography
  }

  // Default to Historical
  return DOCUMENTARY_TEMPLATES[0]; // historical
};
