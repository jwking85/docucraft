
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
You are a documentary video editor.
Your goal is to break down a raw script into a "Visual Storyboard".

**CRITICAL PACING RULES:**
1. **MODERATE PACING:** Target scene duration is **10 to 15 seconds**.
   - Do NOT create a new scene for every single short sentence.
   - **GROUP** related sentences into one visual beat.
   - *Example:* "Blockbuster began in 1985. At the time, stores were small." -> This should be **ONE** scene (approx 10-12s).
2. **VISUAL VARIETY:** Only change the scene when the *visual subject* changes (e.g. moving from "Store Exterior" to "Popcorn on counter").
3. **TOTAL SCENES:** For a 5-minute script, aim for approx 20-30 scenes max. Do not create 100+ scenes.

For each beat:
1. **script_text**: The text segment for this scene (can be multiple sentences).
2. **visual_prompt**: A highly detailed, artistic description for an AI image generator (Imagen/Midjourney style).
3. **suggested_duration**: Estimate based on reading speed (approx 0.4 seconds per word).
4. **motion**: Suggest camera movement (static, slow_zoom_in, slow_zoom_out, pan_left, pan_right).

Return a JSON array of objects:
{
  "script_text": "string",
  "visual_prompt": "string",
  "suggested_duration": number,
  "motion": "string"
}
`;
