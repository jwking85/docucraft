/**
 * Royalty-Free Music Library for YouTube Documentaries
 * Curated list of YouTube Audio Library tracks (all copyright-free)
 */

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  mood: 'epic' | 'dramatic' | 'calm' | 'mysterious' | 'uplifting' | 'dark' | 'hopeful';
  duration: number; // in seconds
  bpm: number;
  genre: string;
  youtubeUrl?: string; // Link to YouTube Audio Library
  preview?: string; // Direct audio URL if available
}

/**
 * Curated documentary music tracks
 * These are examples - you'd integrate with actual music libraries
 */
export const DOCUMENTARY_MUSIC_LIBRARY: MusicTrack[] = [
  {
    id: 'epic-1',
    title: 'Epic Documentary Theme',
    artist: 'Audionautix',
    mood: 'epic',
    duration: 180,
    bpm: 120,
    genre: 'Cinematic',
    youtubeUrl: 'https://www.youtube.com/audiolibrary'
  },
  {
    id: 'calm-1',
    title: 'Peaceful Reflection',
    artist: 'Kevin MacLeod',
    mood: 'calm',
    duration: 240,
    bpm: 80,
    genre: 'Ambient'
  },
  {
    id: 'mysterious-1',
    title: 'Dark Horizons',
    artist: 'Myuu',
    mood: 'mysterious',
    duration: 200,
    bpm: 90,
    genre: 'Atmospheric'
  },
  {
    id: 'dramatic-1',
    title: 'Tension Rising',
    artist: 'Alexander Nakarada',
    mood: 'dramatic',
    duration: 160,
    bpm: 140,
    genre: 'Orchestral'
  },
  {
    id: 'uplifting-1',
    title: 'Hope and Wonder',
    artist: 'Asher Fulero',
    mood: 'uplifting',
    duration: 210,
    bpm: 110,
    genre: 'Inspirational'
  }
];

/**
 * Get music recommendations based on documentary content
 */
export const recommendMusic = (
  scriptContent: string,
  documentaryType: 'historical' | 'nature' | 'true-crime' | 'science' | 'travel'
): MusicTrack[] => {
  const content = scriptContent.toLowerCase();

  // Analyze script for mood keywords
  const hasTension = content.includes('mystery') || content.includes('unknown') || content.includes('hidden');
  const hasAction = content.includes('battle') || content.includes('dramatic') || content.includes('intense');
  const hasPeace = content.includes('peaceful') || content.includes('serene') || content.includes('calm');
  const hasHope = content.includes('hope') || content.includes('inspire') || content.includes('triumph');

  // Filter by mood
  let moods: Array<'epic' | 'dramatic' | 'calm' | 'mysterious' | 'uplifting' | 'dark' | 'hopeful'> = [];

  if (hasTension) moods.push('mysterious', 'dark');
  if (hasAction) moods.push('epic', 'dramatic');
  if (hasPeace) moods.push('calm');
  if (hasHope) moods.push('uplifting', 'hopeful');

  // Default by documentary type
  if (moods.length === 0) {
    switch (documentaryType) {
      case 'historical':
        moods = ['epic', 'dramatic'];
        break;
      case 'nature':
        moods = ['calm', 'uplifting'];
        break;
      case 'true-crime':
        moods = ['mysterious', 'dark', 'dramatic'];
        break;
      case 'science':
        moods = ['uplifting', 'mysterious'];
        break;
      case 'travel':
        moods = ['uplifting', 'calm'];
        break;
    }
  }

  return DOCUMENTARY_MUSIC_LIBRARY.filter(track => moods.includes(track.mood));
};

/**
 * Free music sources for YouTube
 */
export const FREE_MUSIC_SOURCES = [
  {
    name: 'YouTube Audio Library',
    url: 'https://www.youtube.com/audiolibrary',
    description: '100% copyright-free music for YouTube videos'
  },
  {
    name: 'Free Music Archive',
    url: 'https://freemusicarchive.org',
    description: 'Curated collection of high-quality free music'
  },
  {
    name: 'Incompetech',
    url: 'https://incompetech.com/music/royalty-free',
    description: 'Kevin MacLeod\'s royalty-free music library'
  },
  {
    name: 'Bensound',
    url: 'https://www.bensound.com',
    description: 'Royalty-free music for creative projects'
  },
  {
    name: 'Purple Planet',
    url: 'https://www.purple-planet.com',
    description: 'Free music for content creators'
  }
];

/**
 * Calculate optimal music volume based on narration
 */
export const calculateMusicVolume = (
  hasNarration: boolean,
  intensity: 'low' | 'medium' | 'high'
): number => {
  if (!hasNarration) {
    // No narration - music can be louder
    return intensity === 'low' ? 0.4 : intensity === 'medium' ? 0.6 : 0.8;
  } else {
    // With narration - music should be background
    return intensity === 'low' ? 0.1 : intensity === 'medium' ? 0.15 : 0.2;
  }
};

/**
 * Auto-duck music during narration
 * Reduces music volume when voice is present
 */
export const createAutoDuckConfig = (
  voiceStartTimes: number[], // Array of timestamps when voice starts
  voiceDurations: number[]   // Duration of each voice segment
): Array<{ time: number; volume: number }> => {
  const config: Array<{ time: number; volume: number }> = [];
  const normalVolume = 0.3;
  const duckedVolume = 0.1;
  const fadeTime = 0.5; // 0.5 second fade

  voiceStartTimes.forEach((startTime, index) => {
    const duration = voiceDurations[index];

    // Fade down before voice
    config.push({ time: Math.max(0, startTime - fadeTime), volume: normalVolume });
    config.push({ time: startTime, volume: duckedVolume });

    // Fade back up after voice
    const endTime = startTime + duration;
    config.push({ time: endTime, volume: duckedVolume });
    config.push({ time: endTime + fadeTime, volume: normalVolume });
  });

  return config;
};
