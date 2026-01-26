/**
 * SmartTiming - Unit Tests
 *
 * Tests for all timing rules (A-F)
 */

import { calculateSmartTimings, SceneTimingInput, printTimingReport } from './smartTiming';

describe('SmartTiming', () => {
  describe('Rule A: Audio Timing', () => {
    it('should use actual audio timing when available', () => {
      const scenes: SceneTimingInput[] = [
        {
          id: 'scene-1',
          text: 'This is a test scene with audio timing.',
          audioStart: 0.00,
          audioEnd: 3.45,
        },
      ];

      const result = calculateSmartTimings(scenes);

      expect(result).toHaveLength(1);
      expect(result[0].startTime).toBe(0.00);
      expect(result[0].endTime).toBe(3.45);
      expect(result[0].durationSec).toBe(3.45);
      expect(result[0].reason).toBe('narration');
    });

    it('should handle sequential audio timings', () => {
      const scenes: SceneTimingInput[] = [
        { id: 'scene-1', text: 'First scene.', audioStart: 0.00, audioEnd: 5.23 },
        { id: 'scene-2', text: 'Second scene.', audioStart: 5.23, audioEnd: 10.45 },
        { id: 'scene-3', text: 'Third scene.', audioStart: 10.45, audioEnd: 15.67 },
      ];

      const result = calculateSmartTimings(scenes);

      expect(result).toHaveLength(3);
      expect(result[0].endTime).toBe(5.23);
      expect(result[1].startTime).toBe(5.23);
      expect(result[1].endTime).toBe(10.45);
      expect(result[2].startTime).toBe(10.45);
    });
  });

  describe('Rule B: Word Count Estimation', () => {
    it('should calculate duration based on 155 WPM', () => {
      const scenes: SceneTimingInput[] = [
        {
          id: 'scene-1',
          text: 'This is exactly ten words in this test scene here.', // 10 words
        },
      ];

      const result = calculateSmartTimings(scenes, { wpm: 155 });

      // 10 words / 155 WPM = 10 / (155/60) = 10 / 2.583 = ~3.87 seconds base
      // Plus pause padding for period: ~0.3s
      // Total: ~4.17s
      expect(result[0].durationSec).toBeGreaterThan(3.5);
      expect(result[0].durationSec).toBeLessThan(5.0);
      expect(result[0].debugMeta.wordCount).toBe(10);
    });

    it('should add pause padding for punctuation', () => {
      const sceneWithPeriod: SceneTimingInput[] = [
        { id: 'scene-1', text: 'Simple sentence.' },
      ];

      const sceneWithExclamation: SceneTimingInput[] = [
        { id: 'scene-2', text: 'Dramatic sentence!' },
      ];

      const sceneWithCommas: SceneTimingInput[] = [
        { id: 'scene-3', text: 'One, two, three, four.' },
      ];

      const result1 = calculateSmartTimings(sceneWithPeriod);
      const result2 = calculateSmartTimings(sceneWithExclamation);
      const result3 = calculateSmartTimings(sceneWithCommas);

      // Exclamation should have more padding than period
      expect(result2[0].debugMeta.pausePaddingSec).toBeGreaterThan(result1[0].debugMeta.pausePaddingSec);

      // Commas should add incremental padding
      expect(result3[0].debugMeta.pausePaddingSec).toBeGreaterThan(0.3);
    });

    it('should handle ellipsis for dramatic pauses', () => {
      const scenes: SceneTimingInput[] = [
        { id: 'scene-1', text: 'Wait for it... the reveal!' },
      ];

      const result = calculateSmartTimings(scenes);

      // Ellipsis adds 0.6s padding
      expect(result[0].debugMeta.pausePaddingSec).toBeGreaterThan(0.6);
    });
  });

  describe('Rule C: Clamping', () => {
    it('should enforce minimum duration of 1.8s', () => {
      const scenes: SceneTimingInput[] = [
        { id: 'scene-1', text: 'Short' }, // Very short text
      ];

      const result = calculateSmartTimings(scenes);

      expect(result[0].durationSec).toBeGreaterThanOrEqual(1.8);
      expect(result[0].reason).toBe('min');
      expect(result[0].debugMeta.clampApplied).toBe(true);
    });

    it('should enforce maximum duration of 7.0s', () => {
      const scenes: SceneTimingInput[] = [
        {
          id: 'scene-1',
          text: 'This is a very long scene with many words that would exceed the maximum duration limit if we did not clamp it properly to seven seconds maximum.',
        },
      ];

      const result = calculateSmartTimings(scenes);

      expect(result[0].durationSec).toBeLessThanOrEqual(7.0);
      expect(result[0].reason).toBe('max');
      expect(result[0].debugMeta.clampApplied).toBe(true);
    });

    it('should use 1.0s minimum for title scenes', () => {
      const scenes: SceneTimingInput[] = [
        { id: 'scene-1', text: 'Title', sceneType: 'title' },
      ];

      const result = calculateSmartTimings(scenes);

      expect(result[0].durationSec).toBeGreaterThanOrEqual(1.0);
      expect(result[0].durationSec).toBeLessThan(1.8); // Should be less than narration minimum
    });
  });

  describe('Rule D: Auto-Split', () => {
    it('should split long scenes at natural breakpoints', () => {
      const scenes: SceneTimingInput[] = [
        {
          id: 'scene-1',
          text: 'This is the first sentence with many words. This is the second sentence that continues the thought. And here is a third sentence to make it even longer and exceed our maximum duration limit.',
        },
      ];

      const result = calculateSmartTimings(scenes);

      // Should be split into 2 parts
      expect(result.length).toBeGreaterThan(1);
      expect(result.some(r => r.id.includes('part1'))).toBe(true);
      expect(result.some(r => r.id.includes('part2'))).toBe(true);
    });

    it('should NOT split scenes with audio timing', () => {
      const scenes: SceneTimingInput[] = [
        {
          id: 'scene-1',
          text: 'Very long scene that would normally be split but has audio timing.',
          audioStart: 0.00,
          audioEnd: 12.0, // Exceeds max, but should not split
        },
      ];

      const result = calculateSmartTimings(scenes);

      // Should NOT be split because it has audio timing
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('scene-1');
    });
  });

  describe('Rule E: Anti-Jitter Merge', () => {
    it('should merge 3+ consecutive short scenes', () => {
      const scenes: SceneTimingInput[] = [
        { id: 'scene-1', text: 'Short one.' },    // ~1.5s
        { id: 'scene-2', text: 'Short two.' },    // ~1.5s
        { id: 'scene-3', text: 'Short three.' },  // ~1.5s
        { id: 'scene-4', text: 'This is a longer scene with more words.' }, // > 2.2s
      ];

      const result = calculateSmartTimings(scenes);

      // First 3 should be merged
      expect(result.length).toBeLessThan(4);
      expect(result.some(r => r.reason === 'merged')).toBe(true);
    });

    it('should NOT merge only 2 consecutive short scenes', () => {
      const scenes: SceneTimingInput[] = [
        { id: 'scene-1', text: 'Short one.' },
        { id: 'scene-2', text: 'Short two.' },
        { id: 'scene-3', text: 'This is a longer scene.' },
      ];

      const result = calculateSmartTimings(scenes);

      // Should NOT merge (only 2 short scenes)
      expect(result.length).toBe(3);
      expect(result.every(r => r.reason !== 'merged')).toBe(true);
    });
  });

  describe('Rule F: Dead Air Limit', () => {
    it('should limit visual-only scenes to 2.0s', () => {
      const scenes: SceneTimingInput[] = [
        {
          id: 'scene-1',
          text: 'This would be much longer based on word count.',
          sceneType: 'visual-only',
        },
      ];

      const result = calculateSmartTimings(scenes);

      expect(result[0].durationSec).toBeLessThanOrEqual(2.0);
    });

    it('should NOT limit narration scenes', () => {
      const scenes: SceneTimingInput[] = [
        {
          id: 'scene-1',
          text: 'This is a normal narration scene with several words.',
          sceneType: 'narration',
        },
      ];

      const result = calculateSmartTimings(scenes);

      // Should be > 2.0s based on word count
      expect(result[0].durationSec).toBeGreaterThan(2.0);
    });
  });

  describe('Sequencing', () => {
    it('should calculate sequential start/end times', () => {
      const scenes: SceneTimingInput[] = [
        { id: 'scene-1', text: 'First scene with some words.' },
        { id: 'scene-2', text: 'Second scene with more words.' },
        { id: 'scene-3', text: 'Third scene concludes.' },
      ];

      const result = calculateSmartTimings(scenes);

      expect(result[0].startTime).toBe(0);
      expect(result[1].startTime).toBe(result[0].endTime);
      expect(result[2].startTime).toBe(result[1].endTime);
    });

    it('should handle mixed audio and estimated timings', () => {
      const scenes: SceneTimingInput[] = [
        { id: 'scene-1', text: 'Audio scene.', audioStart: 0.00, audioEnd: 5.00 },
        { id: 'scene-2', text: 'Estimated scene.' }, // Should start at 5.00
      ];

      const result = calculateSmartTimings(scenes);

      expect(result[0].endTime).toBe(5.00);
      expect(result[1].startTime).toBe(5.00);
    });
  });

  describe('Debug Metadata', () => {
    it('should include comprehensive debug metadata', () => {
      const scenes: SceneTimingInput[] = [
        { id: 'scene-1', text: 'Test scene with punctuation!' },
      ];

      const result = calculateSmartTimings(scenes);

      expect(result[0].debugMeta).toHaveProperty('wordCount');
      expect(result[0].debugMeta).toHaveProperty('baseSec');
      expect(result[0].debugMeta).toHaveProperty('pausePaddingSec');
      expect(result[0].debugMeta).toHaveProperty('clampApplied');
      expect(result[0].debugMeta.wordCount).toBe(4);
    });

    it('should preserve original duration when clamping', () => {
      const scenes: SceneTimingInput[] = [
        { id: 'scene-1', text: 'X' }, // Will be clamped to minimum
      ];

      const result = calculateSmartTimings(scenes);

      expect(result[0].debugMeta.clampApplied).toBe(true);
      expect(result[0].debugMeta.originalDuration).toBeDefined();
      expect(result[0].debugMeta.originalDuration).toBeLessThan(1.8);
    });
  });
});

// Golden Test: Nickelodeon Script (First 10 Scenes)
describe('Golden Test: Nickelodeon Script', () => {
  it('should produce correct timings for real-world documentary script', () => {
    const nickelodeonScenes: SceneTimingInput[] = [
      {
        id: 'scene-1',
        text: 'For those of us who grew up in the late \'80s and \'90s, Nickelodeon wasn\'t just a TV channel. It was ours.',
      },
      {
        id: 'scene-2',
        text: 'It felt like a secret clubhouse where kids were in charge, where the world was messy, colorful, and chaotic in the best possible way.',
      },
      {
        id: 'scene-3',
        text: 'From the iconic orange splat logo to unforgettable shows like Rugrats, Hey Arnold!, and SpongeBob SquarePants, Nickelodeon defined childhood for an entire generation.',
      },
      {
        id: 'scene-4',
        text: 'But behind the slime and silly cartoons was something deeper: a channel that trusted kids\' intelligence, took risks on weird and wonderful ideas, and dominated the ratings for years.',
      },
      {
        id: 'scene-5',
        text: 'Then something changed. The network that once felt revolutionary started to fade.',
      },
      {
        id: 'scene-6',
        text: 'So what happened? How did Nickelodeon rise to become the gold standard of children\'s television, and why did it lose its magic?',
      },
      {
        id: 'scene-7',
        text: 'This is the story of Nickelodeon: its creative triumphs, its surprising decline, and the legacy it left behind.',
      },
      {
        id: 'scene-8',
        text: 'Nickelodeon didn\'t start as the cultural phenomenon it would become. It launched in 1979 as a small, experimental cable channel with a modest goal: to create commercial-free programming for kids.',
      },
      {
        id: 'scene-9',
        text: 'Early shows like Pinwheel were gentle, educational, and largely forgettable. The network struggled to find an identity and nearly went under multiple times.',
      },
      {
        id: 'scene-10',
        text: 'Everything changed in 1984 when Geraldine Laybourne took over as president. Laybourne had a radical idea: stop talking down to kids.',
      },
    ];

    const result = calculateSmartTimings(nickelodeonScenes);

    // Print detailed report for manual inspection
    printTimingReport(result, nickelodeonScenes);

    // Assertions
    expect(result.length).toBeGreaterThanOrEqual(10); // May have splits

    // All scenes should be within reasonable range
    result.forEach(scene => {
      expect(scene.durationSec).toBeGreaterThanOrEqual(1.0);
      expect(scene.durationSec).toBeLessThanOrEqual(7.0);
    });

    // Scene 1 should start at 0
    expect(result[0].startTime).toBe(0);

    // All scenes should be sequential
    for (let i = 1; i < result.length; i++) {
      expect(result[i].startTime).toBe(result[i - 1].endTime);
    }

    // Longer scenes should have longer durations
    const scene3 = result.find(r => r.id === 'scene-3'); // Long scene
    const scene5 = result.find(r => r.id === 'scene-5'); // Short scene

    if (scene3 && scene5) {
      expect(scene3.durationSec).toBeGreaterThan(scene5.durationSec);
    }

    // All scenes should have debug metadata
    result.forEach(scene => {
      expect(scene.debugMeta).toBeDefined();
      expect(scene.debugMeta.wordCount).toBeGreaterThan(0);
      expect(scene.reason).toBeDefined();
    });
  });
});
