# Current Timing Logic - Data Flow Map

## Overview
Script input → Scene generation → Duration calculation → Timeline rendering

---

## LOCATION 1: Script Breakdown (Initial Scene Generation)
**File:** `services/geminiService.ts` (lines 67-96)

**Function:** `breakdownScript()`

**Duration Calculation:**
```typescript
const wordCount = script_text.trim().split(/\s+/).filter(w => w.length > 0).length;
const calculatedDuration = Math.max(4, Math.min(15, (wordCount * 0.4) + 0.5));
```

**Rules Applied:**
- Base: 0.4 sec/word (150 WPM)
- Padding: +0.5 seconds
- Clamp: min 4s, max 15s
- AI override: If AI suggests duration within 25% of calculated, use AI's value

**Output:** `suggested_duration` property on each StoryBeat

**Issues:**
- Fixed padding of 0.5s doesn't account for punctuation
- No auto-split for scenes > max duration
- No merge for consecutive short scenes
- No distinction between title/transition vs narration scenes

---

## LOCATION 2: Audio Distribution (Auto-Fit Timing)
**File:** `components/StoryWorkspace.tsx` (lines 72-154)

**Function:** `distributeAudioTimings()`

**Duration Calculation:**
```typescript
const totalWords = sum of all scene word counts
const ratio = sceneWordCount / totalWords
const duration = ratio * totalAudioDuration
```

**Rules Applied:**
- Distribute total audio duration proportionally by word count
- Min duration: 1.5s
- Max duration: 15.0s
- Iterative balancing: Steal from longest scenes to meet minimums

**Output:** `startTime`, `endTime`, `suggested_duration` on each beat

**Issues:**
- Doesn't account for pauses/punctuation
- No semantic understanding of scene type
- Balancing algorithm can cause unnatural pacing

---

## LOCATION 3: Audio Sync (AI-Detected Timestamps)
**File:** `services/geminiService.ts` (lines 107-209)

**Function:** `alignAudioToScript()`

**Duration Calculation:**
```typescript
// AI detects actual audio timestamps
timing = { start: X.XX, end: Y.YY } // from audio analysis

// Fallback estimation if AI fails:
const wordCount = segment.text.split(/\s+/).length;
const duration = Math.max(3, wordCount * 0.4 + 0.5);
```

**Rules Applied:**
- Force Scene 1 to start at 0.00s
- Ensure sequential ordering (start >= previous end)
- Minimum 3s duration if AI detection fails
- Fallback to word count estimation

**Output:** `startTime`, `endTime` mapping by scene ID

**Issues:**
- Fallback uses same 0.4 sec/word without punctuation padding
- No validation of AI-detected durations against reasonable ranges
- No debug metadata about which method was used

---

## LOCATION 4: Timeline Rendering
**File:** `components/TimelineView.tsx` (lines 1-100+)

**Function:** Timeline display and playback

**Duration Usage:**
```typescript
// Uses startTime/endTime from beats
// No additional calculation
```

**Rules Applied:**
- Displays whatever durations were set by previous steps
- No normalization or validation

**Output:** Visual timeline + video playback

**Issues:**
- No feedback if durations seem unreasonable
- No visual indication of which timing method was used

---

## TIMING METHODS SUMMARY

| Method | Location | Formula | Min | Max | Padding |
|--------|----------|---------|-----|-----|---------|
| **Script Breakdown** | geminiService.ts:73 | (words × 0.4) + 0.5 | 4s | 15s | Fixed 0.5s |
| **Audio Distribution** | StoryWorkspace.tsx:96 | ratio × totalDuration | 1.5s | 15s | None |
| **Audio Sync (fallback)** | geminiService.ts:194 | (words × 0.4) + 0.5 | 3s | None | Fixed 0.5s |
| **Audio Sync (AI)** | geminiService.ts:164 | AI-detected | None | None | N/A |

---

## PROBLEMS WITH CURRENT APPROACH

### 1. **Multiple Sources of Truth**
Three different places calculate durations with different rules:
- Script breakdown: 4-15s range
- Audio distribution: 1.5-15s range
- Audio sync fallback: 3s minimum, no max

### 2. **No Punctuation-Based Padding**
All estimation methods use fixed 0.5s padding regardless of:
- Sentence-ending punctuation (. ! ?)
- Mid-sentence pauses (, ; :)
- Dramatic pauses (... or !)

### 3. **No Scene Type Awareness**
All scenes treated identically:
- Title cards could be shorter (1-2s)
- Transition scenes could be shorter
- Narration scenes need proper pacing

### 4. **No Auto-Split/Merge**
- Long scenes (>7s) aren't automatically split
- Consecutive short scenes (<2.2s) aren't merged

### 5. **No Debug Metadata**
Impossible to know:
- Which method calculated a duration
- Why a scene has its specific timing
- Word count, padding applied, clamping details

### 6. **Inconsistent Minimums**
- Breakdown: 4s minimum
- Distribution: 1.5s minimum
- Sync fallback: 3s minimum

---

## NEXT STEP: SmartTiming Module

Create **ONE** module that:
1. Replaces ALL three duration calculation methods
2. Implements punctuation-based pause padding
3. Auto-splits long scenes at natural breakpoints
4. Merges consecutive short scenes
5. Adds comprehensive debug metadata
6. Uses consistent min/max rules based on scene type

**Single source of truth:** `services/smartTiming.ts`
