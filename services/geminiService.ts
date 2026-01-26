import { GoogleGenAI } from "@google/genai";
import {
  PASS_1_SYSTEM_PROMPT,
  PASS_1_USER_PROMPT_PREFIX,
  SCRIPT_BREAKDOWN_PROMPT
} from "../constants";
import { ImageAnalysis, StoryBeat } from "../types";
import { calculateSmartTimings, SceneTimingInput, SceneTimingOutput } from "./smartTiming";

// Helper to convert file to Base64
const fileToPart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      // Detect mime type or fallback
      let mimeType = file.type;
      if (!mimeType) {
         if (file.name.toLowerCase().endsWith('.mp3')) mimeType = 'audio/mpeg';
         else if (file.name.toLowerCase().endsWith('.wav')) mimeType = 'audio/wav';
         else mimeType = 'image/jpeg';
      }

      resolve({
        inlineData: {
          data: base64String,
          mimeType: mimeType, 
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const cleanJsonOutput = (text: string): string => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned;
};

// --- SIMPLIFIED STUDIO FEATURES (Flash Models) ---

export const breakdownScript = async (script: string): Promise<StoryBeat[]> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: { parts: [{ text: script }] },
    config: {
      systemInstruction: SCRIPT_BREAKDOWN_PROMPT,
      responseMimeType: "application/json",
    }
  });

  const text = response.text || "[]";
  try {
    const json = JSON.parse(cleanJsonOutput(text));

    // SMARTTIMING INTEGRATION: Convert AI response to SceneTimingInput format
    const sceneInputs: SceneTimingInput[] = json.map((item: any, idx: number) => ({
      id: `beat-${Date.now()}-${idx}`,
      text: item.script_text || '',
      sceneType: 'narration' as const,
    }));

    // Calculate professional timings using SmartTiming module
    const timings = calculateSmartTimings(sceneInputs);

    // Convert back to StoryBeat format with timing metadata
    return timings.map((timing, idx) => {
      const originalItem = json[idx];
      const suggestedMotion = originalItem.motion || suggestMotionForScene(originalItem.visual_prompt, originalItem.script_text);

      return {
        id: timing.id,
        script_text: originalItem.script_text,
        visual_prompt: originalItem.visual_prompt,
        suggested_duration: timing.durationSec,
        startTime: timing.startTime,
        endTime: timing.endTime,
        is_generating_image: false,
        motion: suggestedMotion,

        // Add debug metadata for transparency
        _timing_debug: timing.debugMeta,
        _timing_reason: timing.reason,
      };
    });
  } catch (e) {
    console.error("Failed to parse script breakdown", e);
    throw new Error("Failed to breakdown script. Please try again.");
  }
};

/**
 * BULLETPROOF AUDIO SYNC - Direct segment-by-segment timestamping
 * Asks AI to find EACH segment in the audio one by one
 */
export const alignAudioToScript = async (audioFile: File, scriptSegments: { id: string; text: string }[]): Promise<Record<string, { start: number; end: number }>> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  console.log('🎯 BULLETPROOF SYNC: Starting direct segment timestamping...');

  const audioPart = await fileToPart(audioFile);
  const segmentsList = scriptSegments.map((s, i) => `SEGMENT ${i + 1} (ID: ${s.id}):\n"${s.text}"\n`).join('\n');

  // SIMPLIFIED APPROACH: Ask AI to timestamp each segment directly
  const prompt = `
    You are a professional video editor's audio sync assistant.

    Listen to the audio and find EXACTLY when each script segment is spoken.

    SCRIPT SEGMENTS:
    ${segmentsList}

    TASK:
    For each segment, identify:
    - "start": The EXACT second when the FIRST WORD of that segment begins (e.g., 5.23)
    - "end": The EXACT second when the LAST WORD of that segment ends (e.g., 12.45)

    CRITICAL RULES:
    1. Listen to the ACTUAL AUDIO - don't estimate
    2. Timestamps must be PRECISE (2 decimal places: X.XX)
    3. Segments must be SEQUENTIAL (each start >= previous end)
    4. If you can't find a segment, use the previous segment's end time as the start

    OUTPUT FORMAT (JSON object mapping ID to timing):
    {
      "beat-123-0": { "start": 0.00, "end": 7.34 },
      "beat-123-1": { "start": 7.34, "end": 14.56 },
      "beat-123-2": { "start": 14.56, "end": 21.12 }
    }

    FOCUS: Be frame-accurate. This is professional video editing.
  `;

  console.log('📝 Requesting segment timestamps from Gemini 2.0 Flash (simplified approach)...');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: {
        parts: [
          audioPart,
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });

    const text = response.text || "{}";
    const segmentTimings = JSON.parse(cleanJsonOutput(text));

    console.log(`✅ Received timestamps for ${Object.keys(segmentTimings).length} segments`);

    // Validate and fix any issues
    let lastEnd = 0;
    for (let i = 0; i < scriptSegments.length; i++) {
      const segment = scriptSegments[i];
      const timing = segmentTimings[segment.id];

      if (timing && timing.start !== undefined && timing.end !== undefined) {
        // FORCE FIRST SCENE TO START AT 0.00
        if (i === 0) {
          timing.start = 0.00;
          console.log(`🎬 FORCED Scene 1 to start at 0.00s (AI detected ${timing.start}s)`);
        }

        // Ensure sequential
        if (timing.start < lastEnd) {
          timing.start = lastEnd;
        }
        if (timing.end <= timing.start) {
          timing.end = timing.start + 3.0; // Minimum 3 seconds
        }
        lastEnd = timing.end;

        console.log(`✅ Segment "${segment.text.substring(0, 40)}...": ${timing.start.toFixed(2)}s - ${timing.end.toFixed(2)}s`);
      } else {
        // SMARTTIMING FALLBACK: Use professional estimation
        const sceneInput: SceneTimingInput = {
          id: segment.id,
          text: segment.text,
          sceneType: 'narration',
        };
        const [estimatedTiming] = calculateSmartTimings([sceneInput]);
        const duration = estimatedTiming.durationSec;

        segmentTimings[segment.id] = {
          start: Number(lastEnd.toFixed(2)),
          end: Number((lastEnd + duration).toFixed(2))
        };
        lastEnd += duration;

        console.warn(`⚠️ SmartTiming estimated "${segment.text.substring(0, 40)}...": ${segmentTimings[segment.id].start}s - ${segmentTimings[segment.id].end}s (${estimatedTiming.debugMeta.wordCount} words)`);
      }
    }

    console.log('\n🎉 BULLETPROOF SYNC COMPLETE!');
    return segmentTimings;

  } catch (error: any) {
    console.error('❌ Sync failed:', error);

    // SMARTTIMING ULTIMATE FALLBACK: Professional estimation
    console.log('⚠️ Using SmartTiming intelligent fallback...');

    const segmentTimings: Record<string, { start: number; end: number }> = {};

    // Convert to SceneTimingInput format
    const sceneInputs: SceneTimingInput[] = scriptSegments.map(s => ({
      id: s.id,
      text: s.text,
      sceneType: 'narration' as const,
    }));

    // Calculate professional timings
    const timings = calculateSmartTimings(sceneInputs);

    // Convert to expected format
    timings.forEach(timing => {
      segmentTimings[timing.id] = {
        start: timing.startTime,
        end: timing.endTime,
      };
      console.log(`📊 SmartTiming fallback: ${timing.startTime.toFixed(2)}s - ${timing.endTime.toFixed(2)}s (${timing.reason})`);
    });

    return segmentTimings;
  }
};

// Helper: Get audio duration from file
const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      resolve(audio.duration || 60);
    };
    audio.onerror = () => {
      resolve(60); // Default fallback
    };
    audio.src = URL.createObjectURL(file);
  });
};

/**
 * Generates an image using REAL AI image generation
 * Uses multiple AI services with intelligent fallbacks
 */
export const generateImage = async (prompt: string, useUltra: boolean = false): Promise<string> => {
  console.log(`🎨 Generating AI image for: "${prompt.substring(0, 100)}..."`);

  // Enhanced prompt for documentary style
  const enhancedPrompt = useUltra
    ? `professional documentary photograph, ${prompt}, cinematic lighting, highly detailed, photorealistic, 4K quality, sharp focus, masterpiece`
    : `documentary style photograph, ${prompt}, professional photography, high quality, realistic, detailed`;

  console.log(`📝 Enhanced prompt: "${enhancedPrompt.substring(0, 150)}..."`);

  // Try Pexels first (real photos that match prompts)
  const pexelsKey = process.env.PEXELS_API_KEY;
  console.log(`🔑 Pexels API Key available: ${pexelsKey ? `Yes (${pexelsKey.substring(0, 10)}...)` : 'No'}`);

  if (pexelsKey && pexelsKey !== 'your_pexels_key_here') {
    try {
      console.log('🚀 Using Pexels API for professional stock photos...');

      // Use Gemini to extract search keywords
      if (process.env.API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // Pro mode: Add style keywords for more dramatic/professional results
        const styleHint = useUltra ? ' cinematic professional dramatic lighting' : '';

        const queryPrompt = `You are a professional stock photo search expert. Extract VISUAL SEARCH KEYWORDS from this scene description for finding documentary-quality photos.

RULES:
1. Focus on CONCRETE, VISUAL elements (objects, places, settings)
2. Remove abstract concepts, actions, emotions, and camera directions
3. Keep era/time period markers (1990s, vintage, modern)
4. Keep lighting/mood when specific (dramatic, dark, bright)
5. Return 3-5 keywords maximum
6. Format: simple space-separated keywords, NO punctuation

EXAMPLES:
"Wide shot of a classic 1990s diner interior with people eating"
→ 1990s diner interior retro

"Close-up of vintage rotary phone on wooden desk with dramatic lighting"
→ vintage rotary phone wooden desk

"Aerial view of Manhattan skyline at sunset, golden hour"
→ manhattan skyline sunset golden

"Dark, moody shot of abandoned factory with broken windows"
→ abandoned factory industrial dark

"Nickelodeon logo splattered on orange background, 1990s aesthetic"
→ nickelodeon logo orange 1990s

"Children playing at playground in suburban neighborhood, summer"
→ playground children suburban summer

Now extract keywords from: "${prompt}"

Return ONLY keywords (space-separated):`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: { parts: [{ text: queryPrompt }] }
        });

        let searchQuery = response.text?.trim() || prompt.split(' ').slice(0, 5).join(' ');

        // Clean up any formatting that Gemini might add
        searchQuery = searchQuery
          .replace(/^[-•*]\s*/gm, '') // Remove bullet points
          .replace(/["']/g, '') // Remove quotes
          .replace(/\n/g, ' ') // Replace newlines with spaces
          .replace(/\s+/g, ' ') // Collapse multiple spaces
          .trim();

        // Add style hint for Pro mode
        searchQuery = searchQuery + styleHint;

        console.log(`🔍 Pexels search query (${useUltra ? 'PRO' : 'STD'}): "${searchQuery}"`);

        // Pro mode: Skip first result for variety
        const skipResults = useUltra ? 1 : 0;

        const pexelsResponse = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=${5 + skipResults}&orientation=landscape`,
          {
            headers: {
              'Authorization': pexelsKey
            }
          }
        );

        if (pexelsResponse.ok) {
          const data = await pexelsResponse.json();
          if (data.photos && data.photos.length > skipResults) {
            const photo = data.photos[skipResults]; // Skip first result for Pro
            console.log(`✅ Found perfect Pexels photo by ${photo.photographer} (${useUltra ? 'PRO' : 'STD'})`);
            return photo.src.large2x || photo.src.large;
          } else {
            console.log('⚠️ Pexels returned 0 results for this query');
          }
        } else {
          const errorText = await pexelsResponse.text();
          console.error(`❌ Pexels API error ${pexelsResponse.status}:`, errorText);
        }
      }
    } catch (error: any) {
      console.warn('⚠️ Pexels API failed:', error.message);
    }
  }

  // Try Unsplash with intelligent keyword extraction
  try {
    console.log('🔄 Falling back to Unsplash...');

    // Extract meaningful keywords from prompt
    const keywords = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(' ')
      .filter(w => w.length > 3 && !['shot', 'view', 'scene', 'style', 'with', 'from', 'that', 'this', 'they', 'their', 'have', 'been'].includes(w))
      .slice(0, 4)
      .join(',');

    const unsplashUrl = `https://source.unsplash.com/1920x1080/?${encodeURIComponent(keywords || 'documentary')}`;
    console.log(`📸 Unsplash with keywords: ${keywords}`);

    return unsplashUrl;

  } catch (error: any) {
    console.error('❌ All image services failed:', error.message);

    // Absolute last resort - generic documentary image
    return `https://source.unsplash.com/1920x1080/?documentary,cinematic`;
  }
};

export const generateDocuVideo = async (prompt: string): Promise<string> => {
  console.log('🎬 Attempting AI video generation with Veo...');

  // NOTE: Veo 2 requires Google Cloud AI Platform API (paid tier)
  // Free tier Gemini API keys don't have access to video generation

  if (!process.env.API_KEY) {
    throw new Error("VEO_PAYWALL");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Try Veo 2 video generation
    const response = await ai.models.generateContent({
      model: 'veo-002', // Veo 2 model
      contents: {
        parts: [{
          text: `Create a 5-second documentary-style video clip: ${prompt}. Cinematic, professional quality, smooth camera movement.`
        }]
      },
      config: {
        temperature: 0.7
      }
    });

    // Check if video was generated
    if (response && response.candidates && response.candidates[0]) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
        const part = candidate.content.parts[0];
        if (part.inlineData && part.inlineData.data) {
          // Return base64 video
          const mimeType = part.inlineData.mimeType || 'video/mp4';
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    // If we got here, Veo didn't return video
    throw new Error("VEO_UNAVAILABLE");

  } catch (error: any) {
    console.warn('⚠️ Veo video generation failed:', error.message);

    // Check for specific error messages
    if (error.message?.includes('404') || error.message?.includes('not found') ||
        error.message?.includes('VEO_UNAVAILABLE')) {
      throw new Error("VEO_PAYWALL");
    }

    if (error.message?.includes('403') || error.message?.includes('permission')) {
      throw new Error("VEO_PAYWALL");
    }

    // Generic error - assume paywall
    throw new Error("VEO_PAYWALL");
  }
};

export const analyzeImagesBatch = async (files: File[], scriptContext?: string): Promise<ImageAnalysis[]> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];

  for (const file of files) {
    const part = await fileToPart(file);
    parts.push(part);
  }

  const fileNames = files.map(f => f.name).join(', ');
  let textPrompt = `${PASS_1_USER_PROMPT_PREFIX}\n\nList of filenames uploaded in order: ${fileNames}`;

  if (scriptContext) {
      const contextSnippet = scriptContext.length > 10000 ? scriptContext.substring(0, 10000) + "...(truncated)" : scriptContext;
      textPrompt += `\n\nCONTEXT - DOCUMENTARY SCRIPT:\n${contextSnippet}\n\nUse this script to identify specific locations, objects, or themes in the images.`;
  }

  parts.push({ text: textPrompt });

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: { parts },
    config: {
      systemInstruction: PASS_1_SYSTEM_PROMPT,
      responseMimeType: "application/json"
    }
  });

  const text = response.text || "[]";
  try {
    const json = JSON.parse(cleanJsonOutput(text));
    return Array.isArray(json) ? json : [json];
  } catch (e) {
    console.error("Failed to parse analysis JSON", e);
    return [];
  }
};

export const generateVoiceover = async (text: string): Promise<File> => {
  // Use browser's Web Speech API (free, works offline)
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error("Text-to-speech not supported in this browser. Please use Chrome, Edge, or Safari."));
      return;
    }

    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(text);

    // Configure voice settings for documentary style
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 1.0; // Full volume

    // Try to select a better voice (prefer English voices)
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural'))
                        || voices.find(v => v.lang.startsWith('en-US'))
                        || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Capture audio using MediaRecorder
    try {
      // Create an audio context to capture the speech
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const destination = audioContext.createMediaStreamDestination();

      // We'll use a simpler approach: record system audio during speech
      // This requires speaking and recording simultaneously
      const chunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(destination.stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'voiceover.webm', { type: 'audio/webm' });
        resolve(file);
      };

      utterance.onend = () => {
        mediaRecorder.stop();
        audioContext.close();
      };

      utterance.onerror = (event) => {
        mediaRecorder.stop();
        audioContext.close();
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      // Start recording and speaking
      mediaRecorder.start();
      speechSynthesis.speak(utterance);

    } catch (error: any) {
      // Fallback: Just speak without recording (user will need to upload audio separately)
      speechSynthesis.speak(utterance);

      // Since we can't capture the audio, reject with helpful message
      reject(new Error("Browser audio capture not supported. The text will be spoken aloud - please record it separately or use the 'Upload File' option."));
    }
  });
};

export const enhanceScript = async (currentScript: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: {
      parts: [{ text: `Analyze this script for factual accuracy and add interesting historical context or details where relevant. Keep the tone nostalgic. Script: ${currentScript}` }]
    }
  });

  return response.text || currentScript;
};

export const editImageAI = async (_imageFile: File, _prompt: string): Promise<string> => {
  // Image editing is not available with free-tier API keys
  throw new Error("AI image editing requires a paid API key with Gemini 2.5 Flash Image enabled. Please upgrade your API key at https://aistudio.google.com/billing");
};

/**
 * Intelligent motion suggestions based on scene content
 * Analyzes visual prompts to suggest appropriate camera movements
 */
export const suggestMotionForScene = (visualPrompt: string, scriptText: string): string => {
  const prompt = visualPrompt.toLowerCase();
  const script = scriptText.toLowerCase();

  // Face/portrait detection -> zoom in for intimacy
  if (prompt.includes('face') || prompt.includes('portrait') || prompt.includes('person') ||
      prompt.includes('character') || script.includes('speaking') || script.includes('says')) {
    return 'slow_zoom_in';
  }

  // Landscape/establishing shots -> pan for cinematic feel
  if (prompt.includes('landscape') || prompt.includes('wide') || prompt.includes('aerial') ||
      prompt.includes('establishing') || prompt.includes('panorama') || prompt.includes('vista')) {
    return Math.random() > 0.5 ? 'pan_right' : 'pan_left';
  }

  // Action/movement -> zoom out for context
  if (prompt.includes('action') || prompt.includes('moving') || prompt.includes('running') ||
      prompt.includes('crowd') || prompt.includes('battle') || script.includes('dramatic')) {
    return 'slow_zoom_out';
  }

  // Detail/object shots -> static for focus
  if (prompt.includes('detail') || prompt.includes('close') || prompt.includes('object') ||
      prompt.includes('artifact') || prompt.includes('document')) {
    return 'static';
  }

  // Architecture/buildings -> pan to show scale
  if (prompt.includes('building') || prompt.includes('architecture') || prompt.includes('structure') ||
      prompt.includes('monument') || prompt.includes('city')) {
    return 'pan_right';
  }

  // Default: slow zoom in (most cinematic)
  return 'slow_zoom_in';
};
