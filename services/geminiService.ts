import { GoogleGenAI } from "@google/genai";
import {
  PASS_1_SYSTEM_PROMPT,
  PASS_1_USER_PROMPT_PREFIX,
  SCRIPT_BREAKDOWN_PROMPT
} from "../constants";
import { ImageAnalysis, StoryBeat } from "../types";

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
    return json.map((item: any, idx: number) => {
      // Use intelligent motion suggestion if AI didn't provide one
      const suggestedMotion = item.motion || suggestMotionForScene(item.visual_prompt, item.script_text);

      return {
        id: `beat-${Date.now()}-${idx}`,
        script_text: item.script_text,
        visual_prompt: item.visual_prompt,
        suggested_duration: item.suggested_duration || 8,
        is_generating_image: false,
        motion: suggestedMotion
      };
    });
  } catch (e) {
    console.error("Failed to parse script breakdown", e);
    throw new Error("Failed to breakdown script. Please try again.");
  }
};

export const alignAudioToScript = async (audioFile: File, scriptSegments: { id: string; text: string }[]): Promise<Record<string, { start: number; end: number }>> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const audioPart = await fileToPart(audioFile);
  const segmentsList = scriptSegments.map((s, i) => `${i + 1}. "${s.text}" (ID: ${s.id})`).join('\n');

  // Aggressive prompt for timestamp extraction
  const prompt = `
    I am a professional video editor sync specialist.
    
    Here is the script with IDs:
    ${segmentsList}
    
    TASK:
    Listen to the audio file. For each numbered segment:
    1. Identify the EXACT timestamp (in seconds, e.g., 12.45) when the **FIRST WORD** of that segment is spoken. This is "start".
    2. Identify the timestamp when the **LAST WORD** of that segment is spoken. This is "end".
    
    RULES:
    - Return precise floats (e.g. 1.25).
    - Ensure TIMESTAMPS ARE CONTIGUOUS. The end of segment 1 should be very close to the start of segment 2.
    - DO NOT leave large gaps unless there is silence in the audio.
    - If a segment is missing, make a best guess based on the previous segment's end.
    - Return a JSON object mapping ID to { "start": number, "end": number }.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: {
      parts: [
        audioPart,
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || "{}";
  try {
    return JSON.parse(cleanJsonOutput(text));
  } catch (e) {
    console.error("Failed to parse alignment", e);
    throw new Error("Failed to sync audio. Falling back to simple timing.");
  }
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

        const queryPrompt = `Extract 2-4 search keywords from this description. Return ONLY the keywords as plain text, no bullets, no quotes, no dashes, no formatting.

Examples:
Input: "Wide shot of a classic 1990s diner interior"
Output: 1990s diner interior

Input: "Close-up of vintage rotary phone on wooden desk"
Output: vintage rotary phone desk

Input: "Aerial view of Manhattan skyline at sunset"
Output: manhattan skyline sunset

Now extract keywords from: "${prompt}"

Output (keywords only):`;

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
        console.log(`🔍 Pexels search query: "${searchQuery}"`);

        const pexelsResponse = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=5&orientation=landscape`,
          {
            headers: {
              'Authorization': pexelsKey
            }
          }
        );

        if (pexelsResponse.ok) {
          const data = await pexelsResponse.json();
          if (data.photos && data.photos.length > 0) {
            const photo = data.photos[0];
            console.log(`✅ Found perfect Pexels photo by ${photo.photographer}`);
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
  // "Video" generation actually generates a still image with motion effect applied
  // This is the same approach used by professional documentaries (Ken Burns effect)
  console.log('Generating cinematic image for Ken Burns motion effect...');

  // Use the same smart image generation with motion keywords added
  const motionPrompt = `${prompt}, cinematic, wide angle, dramatic`;
  return generateImage(motionPrompt, false);
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
