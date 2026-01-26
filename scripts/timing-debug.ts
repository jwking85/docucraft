#!/usr/bin/env ts-node
/**
 * CLI Debug Command: timing:debug
 *
 * Usage: npm run timing:debug -- --input <sample>
 *
 * Tests SmartTiming with sample scripts
 */

import { calculateSmartTimings, printTimingReport, SceneTimingInput } from '../services/smartTiming';

const SAMPLES: Record<string, SceneTimingInput[]> = {
  nickelodeon: [
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
  ],

  short: [
    { id: 'scene-1', text: 'Short.' },
    { id: 'scene-2', text: 'Very short!' },
    { id: 'scene-3', text: 'Tiny.' },
    { id: 'scene-4', text: 'This is a longer scene that will not be merged.' },
  ],

  long: [
    {
      id: 'scene-1',
      text: 'This is an extremely long scene that contains many many words and should definitely be auto-split at a natural breakpoint like a period or other sentence-ending punctuation. This is the second sentence. And here is a third sentence to make it even longer.',
    },
  ],

  punctuation: [
    { id: 'scene-1', text: 'Simple sentence.' },
    { id: 'scene-2', text: 'Dramatic sentence!' },
    { id: 'scene-3', text: 'A question?' },
    { id: 'scene-4', text: 'Wait for it... the reveal!' },
    { id: 'scene-5', text: 'One, two, three, four items.' },
  ],

  audio: [
    {
      id: 'scene-1',
      text: 'This scene has audio timing.',
      audioStart: 0.00,
      audioEnd: 3.50,
    },
    {
      id: 'scene-2',
      text: 'This scene is estimated.',
    },
    {
      id: 'scene-3',
      text: 'This scene also has audio.',
      audioStart: 8.00,
      audioEnd: 12.25,
    },
  ],
};

function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  const sampleName = inputIndex >= 0 ? args[inputIndex + 1] : 'nickelodeon';

  if (!SAMPLES[sampleName]) {
    console.error(`❌ Unknown sample: "${sampleName}"`);
    console.error(`Available samples: ${Object.keys(SAMPLES).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n🧪 Testing SmartTiming with sample: "${sampleName}"\n`);

  const scenes = SAMPLES[sampleName];
  const result = calculateSmartTimings(scenes);

  printTimingReport(result, scenes);

  // Summary table
  console.log('SUMMARY TABLE:');
  console.log('─'.repeat(100));
  console.log('Scene'.padEnd(10) + 'Start'.padEnd(10) + 'End'.padEnd(10) + 'Duration'.padEnd(12) + 'Reason'.padEnd(12) + 'Words'.padEnd(8) + 'Text');
  console.log('─'.repeat(100));

  result.forEach((timing, idx) => {
    const scene = scenes.find(s => s.id === timing.id) || scenes[idx];
    const text = scene?.text || '';
    const preview = text.length > 40 ? text.substring(0, 40) + '...' : text;

    console.log(
      `${(idx + 1).toString().padEnd(10)}` +
      `${timing.startTime.toFixed(2).padEnd(10)}` +
      `${timing.endTime.toFixed(2).padEnd(10)}` +
      `${timing.durationSec.toFixed(2).padEnd(12)}` +
      `${timing.reason.padEnd(12)}` +
      `${timing.debugMeta.wordCount.toString().padEnd(8)}` +
      `${preview}`
    );
  });

  console.log('─'.repeat(100));

  const totalDuration = result.reduce((sum, t) => sum + t.durationSec, 0);
  const avgDuration = totalDuration / result.length;
  const totalWords = result.reduce((sum, t) => sum + t.debugMeta.wordCount, 0);

  console.log(`\nTotal Scenes: ${result.length}`);
  console.log(`Total Duration: ${totalDuration.toFixed(2)}s (${(totalDuration / 60).toFixed(2)} minutes)`);
  console.log(`Average Duration: ${avgDuration.toFixed(2)}s`);
  console.log(`Total Words: ${totalWords}`);
  console.log(`Effective WPM: ${((totalWords / totalDuration) * 60).toFixed(1)}`);
  console.log('');
}

main();
