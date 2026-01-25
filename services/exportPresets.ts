/**
 * EXPORT PRESETS SERVICE
 * Platform-optimized export settings for YouTube, TikTok, Instagram, etc.
 */

export interface ExportPreset {
  id: string;
  name: string;
  platform: string;
  description: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number; // kbps
  format: 'mp4' | 'webm' | 'mov';
  aspectRatio: string;
  maxDuration?: number; // seconds
  recommendations: string[];
  icon: string;
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'youtube-1080p',
    name: 'YouTube 1080p',
    platform: 'YouTube',
    description: 'Full HD horizontal video (recommended)',
    width: 1920,
    height: 1080,
    fps: 30,
    bitrate: 8000,
    format: 'mp4',
    aspectRatio: '16:9',
    icon: '📺',
    recommendations: [
      'Perfect for long-form documentaries',
      'Best viewer experience on desktop',
      'Supports 4K upscaling',
      'Ideal for educational content'
    ]
  },
  {
    id: 'youtube-4k',
    name: 'YouTube 4K',
    platform: 'YouTube',
    description: 'Ultra HD for premium quality',
    width: 3840,
    height: 2160,
    fps: 60,
    bitrate: 40000,
    format: 'mp4',
    aspectRatio: '16:9',
    icon: '🎬',
    recommendations: [
      'Maximum quality for cinematics',
      'Better YouTube algorithm ranking',
      'Professional presentation',
      'Large file size - ensure good internet'
    ]
  },
  {
    id: 'youtube-720p',
    name: 'YouTube 720p',
    platform: 'YouTube',
    description: 'HD for faster uploads',
    width: 1280,
    height: 720,
    fps: 30,
    bitrate: 5000,
    format: 'mp4',
    aspectRatio: '16:9',
    icon: '📹',
    recommendations: [
      'Faster rendering and upload',
      'Good for mobile viewers',
      'Smaller file size',
      'Still HD quality'
    ]
  },
  {
    id: 'youtube-shorts',
    name: 'YouTube Shorts',
    platform: 'YouTube Shorts',
    description: 'Vertical 9:16 for Shorts',
    width: 1080,
    height: 1920,
    fps: 30,
    bitrate: 6000,
    format: 'mp4',
    aspectRatio: '9:16',
    maxDuration: 60,
    icon: '📱',
    recommendations: [
      'Maximum 60 seconds duration',
      'Fast-paced cuts (3-5s scenes)',
      'Bold text overlays',
      'Hook in first 2 seconds'
    ]
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    platform: 'TikTok',
    description: 'Vertical optimized for TikTok',
    width: 1080,
    height: 1920,
    fps: 30,
    bitrate: 6000,
    format: 'mp4',
    aspectRatio: '9:16',
    maxDuration: 180,
    icon: '🎵',
    recommendations: [
      'Keep under 3 minutes',
      'Use trending audio',
      'Captions are essential',
      'Fast cuts every 2-4 seconds'
    ]
  },
  {
    id: 'instagram-reel',
    name: 'Instagram Reel',
    platform: 'Instagram',
    description: 'Vertical for Reels',
    width: 1080,
    height: 1920,
    fps: 30,
    bitrate: 6000,
    format: 'mp4',
    aspectRatio: '9:16',
    maxDuration: 90,
    icon: '📸',
    recommendations: [
      'Maximum 90 seconds',
      'Square (1:1) also supported',
      'Add music for better reach',
      'Use Instagram filters/effects'
    ]
  },
  {
    id: 'instagram-feed',
    name: 'Instagram Feed',
    platform: 'Instagram',
    description: 'Square 1:1 for feed posts',
    width: 1080,
    height: 1080,
    fps: 30,
    bitrate: 5000,
    format: 'mp4',
    aspectRatio: '1:1',
    maxDuration: 60,
    icon: '🖼️',
    recommendations: [
      'Keep under 60 seconds',
      'Square format stands out',
      'Great for mobile feeds',
      'Carousel posts work well'
    ]
  },
  {
    id: 'twitter-x',
    name: 'Twitter/X',
    platform: 'Twitter/X',
    description: 'Horizontal HD for Twitter',
    width: 1280,
    height: 720,
    fps: 30,
    bitrate: 5000,
    format: 'mp4',
    aspectRatio: '16:9',
    maxDuration: 140,
    icon: '🐦',
    recommendations: [
      'Maximum 2 minutes 20 seconds',
      'First 6 seconds auto-play',
      'Captions increase engagement',
      'Shorter is better (30-60s)'
    ]
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    platform: 'LinkedIn',
    description: 'Professional horizontal video',
    width: 1920,
    height: 1080,
    fps: 30,
    bitrate: 8000,
    format: 'mp4',
    aspectRatio: '16:9',
    maxDuration: 600,
    icon: '💼',
    recommendations: [
      'Keep under 10 minutes',
      'Professional tone',
      'Educational content performs best',
      'Native uploads get more reach'
    ]
  },
  {
    id: 'facebook',
    name: 'Facebook',
    platform: 'Facebook',
    description: 'Square or horizontal',
    width: 1280,
    height: 720,
    fps: 30,
    bitrate: 5000,
    format: 'mp4',
    aspectRatio: '16:9',
    icon: '👍',
    recommendations: [
      'Square (1:1) works well in feed',
      'Captions essential (85% watch muted)',
      'First 3 seconds critical',
      'Engagement bait works'
    ]
  }
];

/**
 * Get preset by ID
 */
export const getPreset = (id: string): ExportPreset | undefined => {
  return EXPORT_PRESETS.find(p => p.id === id);
};

/**
 * Get all presets for a specific platform
 */
export const getPresetsByPlatform = (platform: string): ExportPreset[] => {
  return EXPORT_PRESETS.filter(p => p.platform === platform);
};

/**
 * Validate video duration against preset requirements
 */
export const validateDuration = (preset: ExportPreset, durationSeconds: number): {
  valid: boolean;
  message?: string;
} => {
  if (preset.maxDuration && durationSeconds > preset.maxDuration) {
    return {
      valid: false,
      message: `Video is ${durationSeconds.toFixed(0)}s but ${preset.name} max is ${preset.maxDuration}s`
    };
  }
  return { valid: true };
};

/**
 * Suggest best preset based on video characteristics
 */
export const suggestPreset = (options: {
  duration: number;
  hasMusic: boolean;
  isVertical: boolean;
  targetPlatform?: string;
}): ExportPreset => {
  const { duration, isVertical, targetPlatform } = options;

  // If platform specified, try to find matching preset
  if (targetPlatform) {
    const platformPresets = getPresetsByPlatform(targetPlatform);
    if (platformPresets.length > 0) {
      // Find best match by duration
      const validPresets = platformPresets.filter(p =>
        !p.maxDuration || duration <= p.maxDuration
      );
      return validPresets[0] || platformPresets[0];
    }
  }

  // Auto-detect based on characteristics
  if (isVertical) {
    if (duration <= 60) return getPreset('youtube-shorts')!;
    if (duration <= 90) return getPreset('instagram-reel')!;
    if (duration <= 180) return getPreset('tiktok')!;
  }

  // Horizontal - default to YouTube
  if (duration <= 180) return getPreset('youtube-720p')!;
  if (duration <= 600) return getPreset('youtube-1080p')!;
  return getPreset('youtube-4k')!;
};

/**
 * Get rendering recommendations based on preset
 */
export const getRenderingTips = (preset: ExportPreset, duration: number): string[] => {
  const tips: string[] = [...preset.recommendations];

  // Add duration-specific tips
  if (preset.maxDuration && duration > preset.maxDuration * 0.8) {
    tips.push(`⚠️ Video is ${duration.toFixed(0)}s (close to ${preset.maxDuration}s limit)`);
  }

  // Add quality tips
  if (preset.bitrate >= 20000) {
    tips.push('💾 High quality = large file size (allow extra export time)');
  }

  if (preset.fps === 60) {
    tips.push('🎬 60 FPS enabled - smooth motion for action scenes');
  }

  return tips;
};
