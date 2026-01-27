// Quick test script for Nickelodeon timing (plain JavaScript)

const nickelodeonScenes = [
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

// Simulate SmartTiming calculations (NEW SETTINGS)
const WPM = 155;
const MIN_DURATION = 3.0;  // Raised from 1.8s - better pacing
const MAX_DURATION = 12.0; // Raised from 7.0s - less aggressive clamping

function countWords(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function calculatePausePadding(text) {
  const trimmed = text.trim();
  let padding = 0;

  const endPunctuation = trimmed.match(/[.!?]+$/);
  const midPunctuation = (trimmed.match(/[,;:]/g) || []).length;
  const ellipsis = (trimmed.match(/\.\.\./g) || []).length;
  const exclamations = (trimmed.match(/!/g) || []).length;
  const questions = (trimmed.match(/\?/g) || []).length;

  if (endPunctuation) {
    if (exclamations > 0) padding += 0.5;
    else if (questions > 0) padding += 0.4;
    else padding += 0.3;
  }

  padding += midPunctuation * 0.15;
  padding += ellipsis * 0.6;

  return padding;
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('        NICKELODEON SCRIPT - TIMING TEST (BEFORE)         ');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('OLD SYSTEM (Fixed 0.5s padding, 4-15s clamp):');
console.log('─'.repeat(100));
console.log('Scene'.padEnd(10) + 'Words'.padEnd(8) + 'Duration'.padEnd(12) + 'Text');
console.log('─'.repeat(100));

let oldCursor = 0;
nickelodeonScenes.forEach((scene, idx) => {
  const wordCount = countWords(scene.text);
  const baseDuration = wordCount * 0.4 + 0.5; // Old system: fixed 0.5s padding
  const clampedDuration = Math.max(4, Math.min(15, baseDuration));

  console.log(
    `${(idx + 1).toString().padEnd(10)}` +
    `${wordCount.toString().padEnd(8)}` +
    `${clampedDuration.toFixed(2).padEnd(12)}` +
    `${scene.text.substring(0, 60)}...`
  );

  oldCursor += clampedDuration;
});

console.log('─'.repeat(100));
console.log(`Total Duration: ${oldCursor.toFixed(2)}s (${(oldCursor / 60).toFixed(2)} minutes)\n`);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('        NICKELODEON SCRIPT - TIMING TEST (AFTER)          ');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('NEW SYSTEM (Punctuation-based padding, 3.0-12.0s clamp):');
console.log('─'.repeat(100));
console.log('Scene'.padEnd(10) + 'Words'.padEnd(8) + 'Base'.padEnd(10) + 'Padding'.padEnd(10) + 'Duration'.padEnd(12) + 'Reason'.padEnd(12) + 'Text');
console.log('─'.repeat(100));

let newCursor = 0;
nickelodeonScenes.forEach((scene, idx) => {
  const wordCount = countWords(scene.text);
  const secondsPerWord = 60 / WPM;
  const baseDuration = wordCount * secondsPerWord;
  const pausePadding = calculatePausePadding(scene.text);
  const estimatedDuration = baseDuration + pausePadding;

  let finalDuration = estimatedDuration;
  let reason = 'estimate';

  if (estimatedDuration < MIN_DURATION) {
    finalDuration = MIN_DURATION;
    reason = 'min';
  } else if (estimatedDuration > MAX_DURATION) {
    finalDuration = MAX_DURATION;
    reason = 'max';
  }

  console.log(
    `${(idx + 1).toString().padEnd(10)}` +
    `${wordCount.toString().padEnd(8)}` +
    `${baseDuration.toFixed(2).padEnd(10)}` +
    `+${pausePadding.toFixed(2).padEnd(9)}` +
    `${finalDuration.toFixed(2).padEnd(12)}` +
    `${reason.padEnd(12)}` +
    `${scene.text.substring(0, 40)}...`
  );

  newCursor += finalDuration;
});

console.log('─'.repeat(100));
console.log(`Total Duration: ${newCursor.toFixed(2)}s (${(newCursor / 60).toFixed(2)} minutes)\n`);

console.log('\n📊 COMPARISON:');
console.log(`Old System Total: ${oldCursor.toFixed(2)}s`);
console.log(`New System Total: ${newCursor.toFixed(2)}s`);
console.log(`Difference: ${(newCursor - oldCursor).toFixed(2)}s (${((newCursor - oldCursor) / oldCursor * 100).toFixed(1)}%)`);
console.log(`\nEffective WPM: ${((nickelodeonScenes.reduce((sum, s) => sum + countWords(s.text), 0) / newCursor) * 60).toFixed(1)}`);
console.log('');
