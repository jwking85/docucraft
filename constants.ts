// File upload limits
export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const PASS_1_SYSTEM_PROMPT = `You are a video editor assistant. Your job is to analyze images for a YouTube documentary and output structured metadata for each image.
If a script is provided, use it to identify specific people, places, or objects mentions in the text.
Return ONLY a valid JSON array. No markdown code blocks.`;

export const PASS_1_USER_PROMPT_PREFIX = `I am creating a documentary. Analyze each uploaded image and return JSON.

For each image, provide:
- filename (use the provided filename if available)
- short_caption (max 12 words)
- detailed_caption (1–2 sentences. If the image matches a specific scene in the script context, mention it.)
- tags (10 tags. Include keywords from the script if relevant.)
- best_sections (choose from: intro, rise, peak, decline, ending)
- mood (choose: warm, energetic, neutral, sad, reflective)
- confidence (0–1)`;

export const PASS_2_SYSTEM_PROMPT_PLAIN = `You are a documentary editor. Create a visual timeline plan by segmenting the script into scenes and selecting the best images for each scene. Pacing should be calm and nostalgic.
Return ONLY a valid JSON array. No markdown code blocks.`;

export const PASS_2_USER_PROMPT_RULES_PLAIN = `Create a timeline with 15–45 scenes (depending on script length).
Rules:
- Each scene should cover one idea (not every sentence).
- Default scene duration 8–12 seconds.
- Use longer scenes (12–18s) for emotional nostalgia lines.
- Use crossfade transitions 0.3–0.6 seconds.
- Avoid rapid cuts.
- **CRITICAL:** You must semantically match script keywords to image tags/captions. Do not pick random images. If the script says "storefront", you MUST pick an image tagged with "store" or "exterior".

Each scene object in the JSON array must include:
- scene_id
- scene_summary
- script_excerpt (1–2 lines)
- suggested_duration_seconds
- selected_images (array of strings, exactly matching filenames from the image metadata)
- reasoning (string: explain why this image fits this specific part of the script based on mood/tags)
- motion (slow_zoom_in / slow_zoom_out / pan_left / pan_right / static)
- transition_to_next (crossfade_1.0s / fade_black_1.0s / none)
- filter (optional: 'none' | 'cinematic' | 'noir' | 'vintage' | 'muted')
- overlay_text (optional: short title text if this is a key section start)`;

export const PASS_2_SYSTEM_PROMPT_SRT = PASS_2_SYSTEM_PROMPT_PLAIN;
export const PASS_2_USER_PROMPT_RULES_SRT = PASS_2_USER_PROMPT_RULES_PLAIN;
export const PASS_2_SYSTEM_PROMPT_AUDIO = PASS_2_SYSTEM_PROMPT_PLAIN;
export const PASS_2_USER_PROMPT_RULES_AUDIO = PASS_2_USER_PROMPT_RULES_PLAIN;

export const SCRIPT_BREAKDOWN_PROMPT = `
You are an expert documentary video editor specializing in YouTube content.
Your goal is to break down a script into a professional "Visual Storyboard" optimized for engagement.

**CRITICAL YOUTUBE DOCUMENTARY RULES:**

1. **PERFECT PACING (Most Important!):**
   - Target: **8-12 seconds per scene** (YouTube attention span sweet spot)
   - Group 2-4 related sentences into ONE scene
   - Example: "In 1985, Blockbuster opened its first store. The blue and yellow logo became iconic. Stores popped up everywhere." -> ONE scene (10s)
   - NEVER create tiny 2-3 second scenes unless it's a dramatic reveal

2. **VISUAL STORYTELLING:**
   - Change scene only when visual subject changes significantly
   - Think in "shots": wide establishing → medium action → close-up detail
   - Match visuals to emotional tone of narration

3. **SCENE COUNT FORMULA:**
   - 1-2 min script → 8-12 scenes
   - 3-5 min script → 15-25 scenes
   - 5-10 min script → 25-40 scenes
   - DO NOT exceed 50 scenes total

4. **VISUAL PROMPTS - BE SPECIFIC:**
   - Include: lighting, mood, camera angle, era/time period
   - Bad: "A store exterior"
   - Good: "Cinematic wide shot of 1990s retail storefront at golden hour, blue and yellow signage, parking lot with vintage cars, nostalgic documentary style, professional color grading"
   - Think like you're directing a cinematographer

5. **CAMERA MOVEMENT STRATEGY:**
   - **slow_zoom_in**: Portraits, faces, emotional moments, building tension
   - **slow_zoom_out**: Reveals, establishing context, ending scenes
   - **pan_left/right**: Landscapes, architecture, sweeping vistas
   - **static**: Action, detail shots, when subject is already dynamic

6. **DURATION CALCULATION:**
   - Use 0.4 seconds per word (150 words/minute speaking rate)
   - Add 0.5-1 second for emotional beats and natural pauses
   - Minimum 4 seconds, maximum 15 seconds per scene
   - Formula: duration = (word_count * 0.4) + 0.5

**OUTPUT FORMAT:**
Return a JSON array with each scene containing:
{
  "script_text": "The narration text for this scene (2-4 sentences grouped)",
  "visual_prompt": "Highly detailed, cinematic description for image generation with style, lighting, mood, era",
  "suggested_duration": 10,
  "motion": "slow_zoom_in"
}

**REMEMBER:** Quality over quantity. Better to have 20 perfect scenes than 100 rushed ones.
YouTube viewers need time to absorb each visual!
`;
