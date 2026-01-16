import { TransitionType } from '../types';

/**
 * YouTube Documentary Utilities
 * Professional tools for creating engaging YouTube documentaries
 */

// ==================== TRANSITIONS ====================

export interface TransitionConfig {
  type: TransitionType;
  duration: number; // in seconds
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

/**
 * Apply transition effect between two canvas states
 */
export const applyTransition = (
  ctx: CanvasRenderingContext2D,
  fromImage: HTMLImageElement | HTMLVideoElement | null,
  toImage: HTMLImageElement | HTMLVideoElement,
  progress: number, // 0 to 1
  transition: TransitionConfig,
  canvasWidth: number,
  canvasHeight: number
): void => {
  // Apply easing
  const easedProgress = applyEasing(progress, transition.easing || 'ease-in-out');

  ctx.save();

  switch (transition.type) {
    case 'crossfade':
      // Draw from image if exists
      if (fromImage) {
        ctx.globalAlpha = 1 - easedProgress;
        ctx.drawImage(fromImage, 0, 0, canvasWidth, canvasHeight);
      }
      // Draw to image on top
      ctx.globalAlpha = easedProgress;
      ctx.drawImage(toImage, 0, 0, canvasWidth, canvasHeight);
      break;

    case 'cut':
      // Instant cut (no transition)
      ctx.drawImage(toImage, 0, 0, canvasWidth, canvasHeight);
      break;

    case 'wipe-left':
      // Wipe from right to left
      if (fromImage) {
        ctx.drawImage(fromImage, 0, 0, canvasWidth, canvasHeight);
      }
      const wipeXLeft = canvasWidth * easedProgress;
      ctx.beginPath();
      ctx.rect(0, 0, wipeXLeft, canvasHeight);
      ctx.clip();
      ctx.drawImage(toImage, 0, 0, canvasWidth, canvasHeight);
      break;

    case 'wipe-right':
      // Wipe from left to right
      if (fromImage) {
        ctx.drawImage(fromImage, 0, 0, canvasWidth, canvasHeight);
      }
      const wipeXRight = canvasWidth * (1 - easedProgress);
      ctx.beginPath();
      ctx.rect(wipeXRight, 0, canvasWidth, canvasHeight);
      ctx.clip();
      ctx.drawImage(toImage, 0, 0, canvasWidth, canvasHeight);
      break;

    case 'slide-left':
      // Slide from right to left
      if (fromImage) {
        const offsetLeft = -canvasWidth * easedProgress;
        ctx.drawImage(fromImage, offsetLeft, 0, canvasWidth, canvasHeight);
      }
      const offsetRightIn = canvasWidth * (1 - easedProgress);
      ctx.drawImage(toImage, offsetRightIn, 0, canvasWidth, canvasHeight);
      break;

    case 'slide-right':
      // Slide from left to right
      if (fromImage) {
        const offsetRight = canvasWidth * easedProgress;
        ctx.drawImage(fromImage, offsetRight, 0, canvasWidth, canvasHeight);
      }
      const offsetLeftIn = -canvasWidth * (1 - easedProgress);
      ctx.drawImage(toImage, offsetLeftIn, 0, canvasWidth, canvasHeight);
      break;

    case 'zoom-in':
      // Zoom in transition
      if (fromImage) {
        ctx.globalAlpha = 1 - easedProgress;
        ctx.drawImage(fromImage, 0, 0, canvasWidth, canvasHeight);
      }
      const zoomInScale = 0.8 + (0.2 * easedProgress);
      const zoomInX = (canvasWidth - canvasWidth * zoomInScale) / 2;
      const zoomInY = (canvasHeight - canvasHeight * zoomInScale) / 2;
      ctx.globalAlpha = easedProgress;
      ctx.drawImage(toImage, zoomInX, zoomInY, canvasWidth * zoomInScale, canvasHeight * zoomInScale);
      break;

    case 'zoom-out':
      // Zoom out transition
      if (fromImage) {
        const zoomOutScale = 1 + (0.2 * easedProgress);
        const zoomOutX = (canvasWidth - canvasWidth * zoomOutScale) / 2;
        const zoomOutY = (canvasHeight - canvasHeight * zoomOutScale) / 2;
        ctx.globalAlpha = 1 - easedProgress;
        ctx.drawImage(fromImage, zoomOutX, zoomOutY, canvasWidth * zoomOutScale, canvasHeight * zoomOutScale);
      }
      ctx.globalAlpha = easedProgress;
      ctx.drawImage(toImage, 0, 0, canvasWidth, canvasHeight);
      break;

    case 'circle-in':
      // Circular reveal from center
      if (fromImage) {
        ctx.drawImage(fromImage, 0, 0, canvasWidth, canvasHeight);
      }
      const maxRadius = Math.sqrt(canvasWidth ** 2 + canvasHeight ** 2) / 2;
      const currentRadius = maxRadius * easedProgress;
      ctx.beginPath();
      ctx.arc(canvasWidth / 2, canvasHeight / 2, currentRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(toImage, 0, 0, canvasWidth, canvasHeight);
      break;

    case 'circle-out':
      // Circular expand from center
      if (fromImage) {
        const maxRadiusOut = Math.sqrt(canvasWidth ** 2 + canvasHeight ** 2) / 2;
        const currentRadiusOut = maxRadiusOut * (1 - easedProgress);
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvasWidth / 2, canvasHeight / 2, currentRadiusOut, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(fromImage, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      }
      ctx.globalAlpha = easedProgress;
      ctx.drawImage(toImage, 0, 0, canvasWidth, canvasHeight);
      break;

    default:
      // Fallback to crossfade
      if (fromImage) {
        ctx.globalAlpha = 1 - easedProgress;
        ctx.drawImage(fromImage, 0, 0, canvasWidth, canvasHeight);
      }
      ctx.globalAlpha = easedProgress;
      ctx.drawImage(toImage, 0, 0, canvasWidth, canvasHeight);
  }

  ctx.restore();
};

/**
 * Apply easing function to progress
 */
const applyEasing = (t: number, easing: string): number => {
  switch (easing) {
    case 'linear':
      return t;
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return t * (2 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default:
      return t;
  }
};

// ==================== KEN BURNS EFFECT ====================

export interface KenBurnsConfig {
  direction: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right';
  duration: number; // Total duration of effect
  intensity?: number; // 0 to 1, default 0.2 (20% zoom/pan)
}

/**
 * Calculate Ken Burns transform for current time
 */
export const calculateKenBurns = (
  progress: number, // 0 to 1
  config: KenBurnsConfig
): { scale: number; offsetX: number; offsetY: number } => {
  const intensity = config.intensity || 0.2;

  switch (config.direction) {
    case 'zoom-in':
      return {
        scale: 1 + (intensity * progress),
        offsetX: 0,
        offsetY: 0
      };

    case 'zoom-out':
      return {
        scale: 1 + intensity - (intensity * progress),
        offsetX: 0,
        offsetY: 0
      };

    case 'pan-left':
      return {
        scale: 1.1, // Slight zoom for cinematic look
        offsetX: intensity * progress * 100, // Percentage
        offsetY: 0
      };

    case 'pan-right':
      return {
        scale: 1.1,
        offsetX: -intensity * progress * 100,
        offsetY: 0
      };

    default:
      return { scale: 1, offsetX: 0, offsetY: 0 };
  }
};

// ==================== TEXT OVERLAYS ====================

export interface TextOverlayConfig {
  text: string;
  position: 'top' | 'middle' | 'bottom' | 'lower-third';
  style: 'default' | 'bold' | 'elegant' | 'modern';
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  animation?: 'fade-in' | 'slide-up' | 'typewriter' | 'none';
}

/**
 * Draw text overlay on canvas
 */
export const drawTextOverlay = (
  ctx: CanvasRenderingContext2D,
  config: TextOverlayConfig,
  canvasWidth: number,
  canvasHeight: number,
  progress?: number // For animations, 0 to 1
): void => {
  ctx.save();

  // Set font style
  const fontSize = config.fontSize || 48;
  let fontFamily = 'Arial, sans-serif';
  let fontWeight = 'normal';

  switch (config.style) {
    case 'bold':
      fontWeight = 'bold';
      fontFamily = 'Impact, Arial Black, sans-serif';
      break;
    case 'elegant':
      fontFamily = 'Georgia, serif';
      break;
    case 'modern':
      fontWeight = '300';
      fontFamily = 'Helvetica Neue, Arial, sans-serif';
      break;
  }

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Calculate position
  let y = canvasHeight / 2;
  switch (config.position) {
    case 'top':
      y = fontSize + 40;
      break;
    case 'middle':
      y = canvasHeight / 2;
      break;
    case 'bottom':
      y = canvasHeight - fontSize - 40;
      break;
    case 'lower-third':
      y = canvasHeight - (canvasHeight / 3);
      break;
  }

  // Apply animation
  let alpha = 1;
  let displayText = config.text;
  let offsetY = 0;

  if (config.animation && progress !== undefined) {
    switch (config.animation) {
      case 'fade-in':
        alpha = progress;
        break;
      case 'slide-up':
        alpha = progress;
        offsetY = 50 * (1 - progress);
        break;
      case 'typewriter':
        const visibleChars = Math.floor(config.text.length * progress);
        displayText = config.text.substring(0, visibleChars);
        break;
    }
  }

  // Draw background bar (for lower-third style)
  if (config.position === 'lower-third' && config.backgroundColor) {
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = config.backgroundColor;
    const barHeight = fontSize + 30;
    const barY = y - barHeight / 2;
    ctx.fillRect(0, barY, canvasWidth, barHeight);
  }

  // Draw text with stroke for readability
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 4;
  ctx.strokeText(displayText, canvasWidth / 2, y + offsetY);

  ctx.fillStyle = config.color || '#ffffff';
  ctx.fillText(displayText, canvasWidth / 2, y + offsetY);

  ctx.restore();
};

// ==================== THUMBNAIL GENERATOR ====================

/**
 * Generate YouTube thumbnail from a scene
 */
export const generateThumbnail = async (
  image: HTMLImageElement | HTMLVideoElement,
  title: string,
  style: 'dramatic' | 'clean' | 'text-heavy' = 'dramatic'
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;

  // Draw base image
  ctx.drawImage(image, 0, 0, 1280, 720);

  // Apply dark overlay for text readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, 1280, 720);

  if (style === 'dramatic') {
    // Large bold text
    ctx.font = 'bold 80px Impact, Arial Black';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 8;
    ctx.fillStyle = 'white';

    // Word wrap for long titles
    const words = title.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 1100) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    // Draw lines centered
    const lineHeight = 90;
    const totalHeight = lines.length * lineHeight;
    const startY = (720 - totalHeight) / 2 + 50;

    lines.forEach((line, i) => {
      const y = startY + (i * lineHeight);
      ctx.strokeText(line, 640, y);
      ctx.fillText(line, 640, y);
    });
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95);
  });
};

// ==================== CHAPTER MARKERS ====================

export interface ChapterMarker {
  time: number; // in seconds
  title: string;
}

/**
 * Generate YouTube chapter markers from timeline
 */
export const generateChapterMarkers = (
  scenes: { start: number; title: string }[]
): string => {
  // YouTube format: 00:00 - Chapter Title
  return scenes
    .map((scene) => {
      const minutes = Math.floor(scene.start / 60);
      const seconds = Math.floor(scene.start % 60);
      const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      return `${timestamp} - ${scene.title}`;
    })
    .join('\n');
};

// ==================== COLOR GRADING ====================

export const applyColorGrade = (
  ctx: CanvasRenderingContext2D,
  preset: string,
  canvasWidth: number,
  canvasHeight: number
): void => {
  ctx.save();

  switch (preset) {
    case 'cinematic':
      // Slightly desaturated with blue shadows
      ctx.globalCompositeOperation = 'color';
      const gradCinematic = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      gradCinematic.addColorStop(0, 'rgba(20, 30, 50, 0.1)');
      gradCinematic.addColorStop(1, 'rgba(50, 30, 20, 0.1)');
      ctx.fillStyle = gradCinematic;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      break;

    case 'warm':
      // Orange/yellow tint
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(255, 200, 100, 0.15)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      break;

    case 'cool':
      // Blue tint
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(100, 150, 255, 0.15)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      break;

    case 'dramatic':
      // High contrast with vignette
      ctx.globalCompositeOperation = 'multiply';
      const radGrad = ctx.createRadialGradient(
        canvasWidth / 2, canvasHeight / 2, 0,
        canvasWidth / 2, canvasHeight / 2, Math.max(canvasWidth, canvasHeight) / 1.5
      );
      radGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      radGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      break;
  }

  ctx.restore();
};

// ==================== AUTO-CAPTIONING ====================

/**
 * Generate captions from audio using Web Speech API
 * Note: This is a placeholder - actual implementation would need audio transcription
 */
export const generateCaptionsFromAudio = async (
  audioFile: File
): Promise<string> => {
  // This would integrate with Web Speech API or external service
  // For now, return placeholder SRT format
  return `1
00:00:00,000 --> 00:00:05,000
[Narration begins]

2
00:00:05,000 --> 00:00:10,000
[Continue narration]`;
};
