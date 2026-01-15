
export interface ProcessedImage {
  id: string;
  file?: File; // Optional now, as it might be an AI generated blob URL
  previewUrl: string;
  analysis?: ImageAnalysis;
  source: 'upload' | 'generated';
  mediaType: 'image' | 'video'; // Added to support video
  isAnalyzing?: boolean;
}

export interface ImageAnalysis {
  filename: string;
  short_caption: string;
  detailed_caption: string;
  tags: string[];
  best_sections: 'intro' | 'rise' | 'peak' | 'decline' | 'ending';
  mood: 'warm' | 'energetic' | 'neutral' | 'sad' | 'reflective';
  confidence: number;
}

export interface StoryBeat {
  id: string;
  script_text: string;
  visual_prompt: string;
  suggested_duration: number;
  selected_image_id?: string; // Links to ProcessedImage
  is_generating_image: boolean;
  motion: 'static' | 'slow_zoom_in' | 'slow_zoom_out' | 'pan_left' | 'pan_right';
  startTime?: number; // Added for precise audio syncing
  endTime?: number;   // Added for precise audio syncing
}

export interface TimelineScene {
  scene_id: string | number;
  start_time?: string;
  end_time?: string;
  suggested_duration_seconds?: number;
  scene_summary: string;
  script_excerpt?: string;
  selected_images: string[]; // filenames
  reasoning?: string; 
  motion: string;
  transition_to_next?: string;
  transition?: string;
  filter?: 'none' | 'cinematic' | 'noir' | 'vintage' | 'muted';
  overlay_text?: string;
}

export interface ProjectFile {
  version: number;
  timestamp: number;
  images: {
    id: string;
    name: string;
    type: string;
    data: string; // Base64
    source: 'upload' | 'generated';
    mediaType: 'image' | 'video';
    analysis?: ImageAnalysis;
  }[];
  timeline: TimelineScene[];
  script: string;
  audioData?: string; // Base64
  audioName?: string;
}

export enum AppStep {
  WORKSPACE = 'WORKSPACE', // Unified view
  EXPORT = 'EXPORT'
}

export enum ScriptType {
  PLAIN_TEXT = 'PLAIN_TEXT',
  SRT = 'SRT'
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
