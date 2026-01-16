import { GoogleGenerativeAI } from "@google/generative-ai";
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

  // Use REST API directly with Gemini 1.5 Flash (Free tier)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: script }]
      }],
      systemInstruction: {
        parts: [{ text: SCRIPT_BREAKDOWN_PROMPT }]
      },
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  try {
    const json = JSON.parse(cleanJsonOutput(text));
    return json.map((item: any, idx: number) => ({
      id: `beat-${Date.now()}-${idx}`,
      script_text: item.script_text,
      visual_prompt: item.visual_prompt,
      suggested_duration: item.suggested_duration || 8,
      is_generating_image: false,
      motion: item.motion || 'slow_zoom_in'
    }));
  } catch (e) {
    console.error("Failed to parse script breakdown", e);
    throw new Error("Failed to breakdown script. Please try again.");
  }
};

export const alignAudioToScript = async (audioFile: File, scriptSegments: { id: string; text: string }[]): Promise<Record<string, { start: number; end: number }>> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const genAI = new GoogleGenerativeAI(process.env.API_KEY);

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

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: "application/json" }
  });

  const result = await model.generateContent([
    audioPart,
    { text: prompt }
  ]);

  const text = result.response.text() || "{}";
  try {
    return JSON.parse(cleanJsonOutput(text));
  } catch (e) {
    console.error("Failed to parse alignment", e);
    throw new Error("Failed to sync audio. Falling back to simple timing.");
  }
};

/**
 * Generates an image using either Flash (Standard) or Imagen 4 (Ultra)
 */
export const generateImage = async (prompt: string, useUltra: boolean = false): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const genAI = new GoogleGenerativeAI(process.env.API_KEY);
  
  // Image generation not available with free tier - skip Ultra option
  if (useUltra) {
    throw new Error("IMAGEN_UNAVAILABLE");
  }

  // OPTION 2: Standard Quality - NOT AVAILABLE with free tier
  // Free tier doesn't support image generation
  throw new Error("Image generation requires a paid API key with Imagen or Gemini 2.5 Flash Image enabled. Please upgrade your API key at https://aistudio.google.com/billing or disable image generation features.");
};

export const generateDocuVideo = async (_prompt: string): Promise<string> => {
  // Video generation not available with free tier
  throw new Error("VEO_PAYWALL");
};

export const analyzeImagesBatch = async (files: File[], scriptContext?: string): Promise<ImageAnalysis[]> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");

  const genAI = new GoogleGenerativeAI(process.env.API_KEY);
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

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: PASS_1_SYSTEM_PROMPT,
    generationConfig: { responseMimeType: "application/json" }
  });

  const result = await model.generateContent(parts);
  const text = result.response.text() || "[]";
  try {
    const json = JSON.parse(cleanJsonOutput(text));
    return Array.isArray(json) ? json : [json];
  } catch (e) {
    console.error("Failed to parse analysis JSON", e);
    return [];
  }
};

export const generateVoiceover = async (_text: string): Promise<File> => {
  // TTS is not available with free-tier API keys
  throw new Error("Text-to-speech requires a paid API key. Please use the 'Upload File' option to add your own voiceover, or upgrade your API key at https://aistudio.google.com/billing");
};

export const enhanceScript = async (currentScript: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const genAI = new GoogleGenerativeAI(process.env.API_KEY);

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(`Analyze this script for factual accuracy and add interesting historical context or details where relevant. Keep the tone nostalgic. Script: ${currentScript}`);
  return result.response.text() || currentScript;
};

export const editImageAI = async (_imageFile: File, _prompt: string): Promise<string> => {
  // Image editing is not available with free-tier API keys
  throw new Error("AI image editing requires a paid API key with Gemini 2.5 Flash Image enabled. Please upgrade your API key at https://aistudio.google.com/billing");
};
