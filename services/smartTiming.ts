/**
 * SmartTiming - Professional Scene Timing System
 *
 * Single source of truth for all duration calculations in DocuCraft.
 * Implements narration-aligned, deterministic, debuggable timing.
 *
 * Rules:
 * A. Use actual narration audio duration if available
 * B. Estimate with WPM=155 and punctuation-based pause padding
 * C. Clamp to min 1.8s, max 7.0s (title/transition min 1.0s)
 * D. Auto-split scenes > max duration at natural breakpoints
 * E. Anti-jitter - merge 3+ consecutive scenes under 2.2s
 * F. No dead air - scenes without narration/text <= 2.0s
 */

export interface SceneTimingInput {
  id: string;
  text: string;
  sceneType?: 'narration' | 'title' | 'transition' | 'visual-only';

  // Optional: AI-detected audio timing
  audioStart?: number;
  audioEnd?: number;
}

export interface SceneTimingOutput {
  id: string;
  startTime: number;
  endTime: number;
  durationSec: number;
  text: string; // Preserve the actual text (important for split scenes)

  // Debug metadata
  reason: 'narration' | 'estimate' | 'clamp' | 'min' | 'max' | 'split' | 'merged';
  debugMeta: {
    wordCount: number;
    baseSec: number;
    pausePaddingSec: number;
    clampApplied: boolean;
    splitParts?: number;
    mergeGroupId?: string;
    originalDuration?: number;
  };
}

interface TimingConfig {
  wpm: number;              // Words per minute (default: 155)
  minDuration: number;      // Minimum scene duration in seconds
  maxDuration: number;      // Maximum scene duration in seconds
  minTitleDuration: number; // Minimum for title/transition scenes
  shortSceneThreshold: number; // Threshold for "short" scene (for merging)
  mergeMinConsecutive: number; // How many consecutive short scenes trigger merge
  maxDeadAir: number;       // Max duration for visual-only scenes
}

const DEFAULT_CONFIG: TimingConfig = {
  wpm: 155,
  minDuration: 3.0,      // Raised from 1.8s - scenes too short are jarring
  maxDuration: 12.0,     // Raised from 7.0s - was splitting too aggressively
  minTitleDuration: 1.5, // Raised from 1.0s - titles need time to read
  shortSceneThreshold: 2.2,
  mergeMinConsecutive: 3,
  maxDeadAir: 2.0,
};

/**
 * Calculate pause padding based on punctuation in text
 */
function calculatePausePadding(text: string): number {
  const trimmed = text.trim();
  let padding = 0;

  // Count punctuation types
  const endPunctuation = trimmed.match(/[.!?]+$/);
  const midPunctuation = (trimmed.match(/[,;:]/g) || []).length;
  const ellipsis = (trimmed.match(/\.\.\./g) || []).length;
  const exclamations = (trimmed.match(/!/g) || []).length;
  const questions = (trimmed.match(/\?/g) || []).length;

  // Sentence-ending punctuation
  if (endPunctuation) {
    if (exclamations > 0) padding += 0.5; // Dramatic pause after exclamation
    else if (questions > 0) padding += 0.4; // Pause after question
    else padding += 0.3; // Standard sentence-ending pause
  }

  // Mid-sentence pauses
  padding += midPunctuation * 0.15; // Commas, semicolons, colons

  // Ellipsis (dramatic pause)
  padding += ellipsis * 0.6;

  return padding;
}

/**
 * Count words in text (handles contractions properly)
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Calculate base duration from word count (Rule B)
 */
function calculateBaseDuration(text: string, config: TimingConfig): number {
  const wordCount = countWords(text);
  const secondsPerWord = 60 / config.wpm; // 155 WPM = ~0.387 sec/word
  const baseDuration = wordCount * secondsPerWord;
  const pausePadding = calculatePausePadding(text);

  return baseDuration + pausePadding;
}

/**
 * Find natural breakpoint in text for splitting long scenes
 */
function findSplitPoint(text: string): number | null {
  const sentences = text.split(/([.!?]+\s+)/);
  if (sentences.length < 3) return null; // Need at least 2 sentences to split

  // Try to split at middle sentence
  const midPoint = Math.floor(sentences.length / 2);
  const firstHalf = sentences.slice(0, midPoint).join('');

  return firstHalf.length;
}

/**
 * RULE A: Use actual audio timing if available
 */
function applyAudioTiming(scene: SceneTimingInput, config: TimingConfig): SceneTimingOutput | null {
  if (scene.audioStart !== undefined && scene.audioEnd !== undefined) {
    const duration = scene.audioEnd - scene.audioStart;
    const wordCount = countWords(scene.text);

    return {
      id: scene.id,
      startTime: scene.audioStart,
      endTime: scene.audioEnd,
      durationSec: Number(duration.toFixed(2)),
      text: scene.text,
      reason: 'narration',
      debugMeta: {
        wordCount,
        baseSec: duration,
        pausePaddingSec: 0,
        clampApplied: false,
      },
    };
  }

  return null;
}

/**
 * RULE B + C: Estimate with WPM and punctuation, then clamp
 */
function estimateAndClampDuration(scene: SceneTimingInput, config: TimingConfig): SceneTimingOutput {
  const wordCount = countWords(scene.text);
  const pausePadding = calculatePausePadding(scene.text);
  const secondsPerWord = 60 / config.wpm;
  const baseDuration = wordCount * secondsPerWord;
  const estimatedDuration = baseDuration + pausePadding;

  // Determine min/max based on scene type (Rule C)
  const isSpecialScene = scene.sceneType === 'title' || scene.sceneType === 'transition';
  const minDuration = isSpecialScene ? config.minTitleDuration : config.minDuration;
  const maxDuration = config.maxDuration;

  // Apply clamping
  let finalDuration = estimatedDuration;
  let clampApplied = false;
  let reason: 'estimate' | 'clamp' | 'min' | 'max' = 'estimate';

  if (estimatedDuration < minDuration) {
    finalDuration = minDuration;
    clampApplied = true;
    reason = 'min';
  } else if (estimatedDuration > maxDuration) {
    finalDuration = maxDuration;
    clampApplied = true;
    reason = 'max';
  }

  return {
    id: scene.id,
    startTime: 0, // Will be set during sequencing
    endTime: 0,   // Will be set during sequencing
    durationSec: Number(finalDuration.toFixed(2)),
    text: scene.text,
    reason,
    debugMeta: {
      wordCount,
      baseSec: Number(baseDuration.toFixed(2)),
      pausePaddingSec: Number(pausePadding.toFixed(2)),
      clampApplied,
      originalDuration: Number(estimatedDuration.toFixed(2)),
    },
  };
}

/**
 * RULE D: Auto-split scenes exceeding max duration
 * DISABLED: Auto-split was too aggressive, creating too many scenes.
 * Instead, we rely on clamping to max duration.
 */
function autoSplitLongScenes(
  scenes: SceneTimingInput[],
  config: TimingConfig
): SceneTimingInput[] {
  // DISABLED: Just return scenes as-is
  // The AI already does a good job of scene breakdown
  // Clamping to maxDuration handles any edge cases
  return scenes;
}

/**
 * RULE E: Merge consecutive short scenes (anti-jitter)
 */
function mergeShortScenes(
  timings: SceneTimingOutput[],
  originalScenes: SceneTimingInput[],
  config: TimingConfig
): SceneTimingOutput[] {
  const result: SceneTimingOutput[] = [];
  let i = 0;

  while (i < timings.length) {
    const current = timings[i];

    // Check if this starts a sequence of short scenes
    const shortSequence: number[] = [];
    let j = i;

    while (j < timings.length && timings[j].durationSec < config.shortSceneThreshold) {
      shortSequence.push(j);
      j++;
    }

    // If we have 3+ consecutive short scenes, merge them (Rule E)
    if (shortSequence.length >= config.mergeMinConsecutive) {
      const mergedIndices = shortSequence;
      const mergedTexts = mergedIndices.map(idx => originalScenes[idx].text).join(' ');
      const mergedWordCount = countWords(mergedTexts);
      const mergedDuration = mergedIndices.reduce((sum, idx) => sum + timings[idx].durationSec, 0);
      const mergeGroupId = `merge-${i}-${j-1}`;

      result.push({
        id: `${timings[i].id}-merged`,
        startTime: 0, // Will be set during sequencing
        endTime: 0,
        durationSec: Number(mergedDuration.toFixed(2)),
        text: mergedTexts,
        reason: 'merged',
        debugMeta: {
          wordCount: mergedWordCount,
          baseSec: mergedDuration,
          pausePaddingSec: 0,
          clampApplied: false,
          mergeGroupId,
        },
      });

      console.log(`🔗 Merged ${mergedIndices.length} short scenes (${mergeGroupId}): ${mergedDuration.toFixed(1)}s`);

      i = j; // Skip past merged scenes
    } else {
      // Not part of merge sequence, keep as-is
      result.push(current);
      i++;
    }
  }

  return result;
}

/**
 * RULE F: Limit visual-only scenes to max dead air
 */
function applyDeadAirLimit(scene: SceneTimingInput, timing: SceneTimingOutput, config: TimingConfig): SceneTimingOutput {
  if (scene.sceneType === 'visual-only' && timing.durationSec > config.maxDeadAir) {
    return {
      ...timing,
      durationSec: config.maxDeadAir,
      text: scene.text,
      reason: 'clamp',
      debugMeta: {
        ...timing.debugMeta,
        clampApplied: true,
        originalDuration: timing.durationSec,
      },
    };
  }

  return timing;
}

/**
 * Calculate sequential start/end times from durations
 */
function sequenceTimings(timings: SceneTimingOutput[]): SceneTimingOutput[] {
  let cursor = 0;

  return timings.map(timing => {
    // If scene already has audio timing, use it
    if (timing.reason === 'narration' && timing.startTime !== undefined) {
      cursor = timing.endTime;
      return timing;
    }

    // Otherwise, calculate from cursor
    const start = cursor;
    const end = cursor + timing.durationSec;
    cursor = end;

    return {
      ...timing,
      startTime: Number(start.toFixed(2)),
      endTime: Number(end.toFixed(2)),
    };
  });
}

/**
 * MAIN FUNCTION: Calculate smart timings for all scenes
 */
export function calculateSmartTimings(
  scenes: SceneTimingInput[],
  config: Partial<TimingConfig> = {}
): SceneTimingOutput[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  console.log('🧠 SmartTiming: Starting professional scene timing calculation...');
  console.log(`📊 Config: ${finalConfig.wpm} WPM, ${finalConfig.minDuration}-${finalConfig.maxDuration}s range`);

  // STEP 1: Auto-split long scenes (Rule D)
  const processedScenes = autoSplitLongScenes(scenes, finalConfig);

  // STEP 2: Calculate individual scene timings
  const timings: SceneTimingOutput[] = processedScenes.map(scene => {
    // RULE A: Try audio timing first
    const audioTiming = applyAudioTiming(scene, finalConfig);
    if (audioTiming) return audioTiming;

    // RULE B + C: Estimate with WPM and clamp
    let timing = estimateAndClampDuration(scene, finalConfig);

    // RULE F: Apply dead air limit for visual-only
    timing = applyDeadAirLimit(scene, timing, finalConfig);

    return timing;
  });

  // STEP 3: Merge consecutive short scenes (Rule E)
  const mergedTimings = mergeShortScenes(timings, processedScenes, finalConfig);

  // STEP 4: Calculate sequential start/end times
  const sequencedTimings = sequenceTimings(mergedTimings);

  console.log(`✅ SmartTiming: Calculated ${sequencedTimings.length} scenes (from ${scenes.length} input scenes)`);

  // Log summary
  const totalDuration = sequencedTimings.reduce((sum, t) => sum + t.durationSec, 0);
  const narrationCount = sequencedTimings.filter(t => t.reason === 'narration').length;
  const estimateCount = sequencedTimings.filter(t => t.reason === 'estimate').length;
  const clampCount = sequencedTimings.filter(t => t.reason === 'min' || t.reason === 'max').length;
  const mergedCount = sequencedTimings.filter(t => t.reason === 'merged').length;

  console.log(`📈 Total: ${totalDuration.toFixed(1)}s | Narration: ${narrationCount} | Estimate: ${estimateCount} | Clamped: ${clampCount} | Merged: ${mergedCount}`);

  return sequencedTimings;
}

/**
 * Helper: Convert SmartTiming output to StoryBeat format
 */
export function convertToStoryBeats(timings: SceneTimingOutput[], originalScenes: SceneTimingInput[]): any[] {
  return timings.map((timing, idx) => {
    const originalScene = originalScenes.find(s => s.id === timing.id) || originalScenes[idx];

    return {
      id: timing.id,
      script_text: originalScene?.text || '',
      visual_prompt: '', // Will be filled by scene generation
      suggested_duration: timing.durationSec,
      startTime: timing.startTime,
      endTime: timing.endTime,
      is_generating_image: false,
      motion: 'slow_zoom_in',

      // Add debug metadata
      _timing_debug: timing.debugMeta,
      _timing_reason: timing.reason,
    };
  });
}

/**
 * Debugging helper: Print detailed timing report
 */
export function printTimingReport(timings: SceneTimingOutput[], scenes: SceneTimingInput[]): void {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('                   TIMING DEBUG REPORT                      ');
  console.log('═══════════════════════════════════════════════════════════\n');

  timings.forEach((timing, idx) => {
    const scene = scenes.find(s => s.id === timing.id) || scenes[idx];
    const text = scene?.text || '';
    const preview = text.length > 50 ? text.substring(0, 50) + '...' : text;

    console.log(`Scene ${idx + 1}: "${preview}"`);
    console.log(`  ├─ Timing: ${timing.startTime.toFixed(2)}s → ${timing.endTime.toFixed(2)}s (${timing.durationSec.toFixed(2)}s)`);
    console.log(`  ├─ Reason: ${timing.reason}`);
    console.log(`  ├─ Words: ${timing.debugMeta.wordCount}`);
    console.log(`  ├─ Base: ${timing.debugMeta.baseSec.toFixed(2)}s`);
    console.log(`  ├─ Pause Padding: +${timing.debugMeta.pausePaddingSec.toFixed(2)}s`);

    if (timing.debugMeta.clampApplied) {
      console.log(`  ├─ ⚠️  Clamped from ${timing.debugMeta.originalDuration?.toFixed(2)}s`);
    }

    if (timing.debugMeta.splitParts) {
      console.log(`  ├─ 🔪 Split into ${timing.debugMeta.splitParts} parts`);
    }

    if (timing.debugMeta.mergeGroupId) {
      console.log(`  ├─ 🔗 Merged (${timing.debugMeta.mergeGroupId})`);
    }

    console.log('');
  });

  const totalDuration = timings.reduce((sum, t) => sum + t.durationSec, 0);
  console.log(`Total Duration: ${totalDuration.toFixed(2)}s (${(totalDuration / 60).toFixed(2)} minutes)`);
  console.log('═══════════════════════════════════════════════════════════\n');
}
