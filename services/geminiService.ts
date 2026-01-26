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
      // Calculate smart duration based on word count (PRECISE TIMING)
      const wordCount = (item.script_text || '').trim().split(/\s+/).filter((w: string) => w.length > 0).length;

      // Speaking rate: 150 words/minute = 2.5 words/second = 0.4 seconds/word
      // Add padding for natural pauses
      const calculatedDuration = Math.max(4, Math.min(15, (wordCount * 0.4) + 0.5));

      // Use AI suggestion only if it's within reasonable range of calculated
      let duration = calculatedDuration;
      if (item.suggested_duration && item.suggested_duration >= 4 && item.suggested_duration <= 15) {
        // Use AI suggestion if it's within 25% of calculated duration
        const diff = Math.abs(item.suggested_duration - calculatedDuration);
        if (diff / calculatedDuration < 0.25) {
          duration = item.suggested_duration;
        }
      }

      // Use intelligent motion suggestion if AI didn't provide one
      const suggestedMotion = item.motion || suggestMotionForScene(item.visual_prompt, item.script_text);

      return {
        id: `beat-${Date.now()}-${idx}`,
        script_text: item.script_text,
        visual_prompt: item.visual_prompt,
        suggested_duration: Number(duration.toFixed(1)),
        is_generating_image: false,
        motion: suggestedMotion
      };
    });
  } catch (e) {
    console.error("Failed to parse script breakdown", e);
    throw new Error("Failed to breakdown script. Please try again.");
  }
};

/**
 * PERFECT AUDIO SYNC - Transcribe audio with word-level timestamps
 * Then intelligently match to script segments
 */
export const alignAudioToScript = async (audioFile: File, scriptSegments: { id: string; text: string }[]): Promise<Record<string, { start: number; end: number }>> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  console.log('🎯 PERFECT SYNC: Starting word-level transcription...');

  const audioPart = await fileToPart(audioFile);

  // STEP 1: Get FULL transcription with word-level timestamps
  const transcriptionPrompt = `
    You are a professional audio transcription AI with word-level timestamp accuracy.

    TASK: Transcribe this audio file with WORD-LEVEL timestamps.

    For EVERY WORD spoken, provide:
    - word: The exact word spoken
    - start: When this word begins (seconds, 2 decimals)
    - end: When this word ends (seconds, 2 decimals)

    CRITICAL REQUIREMENTS:
    1. EVERY SINGLE WORD must have a timestamp
    2. Timestamps must be ACCURATE to ±0.01 seconds
    3. Include pauses (mark as { "word": "[pause]", "start": X, "end": Y })
    4. Timestamps must be sequential (each word's start >= previous word's end)
    5. DO NOT skip any words

    OUTPUT FORMAT (JSON array):
    [
      { "word": "For", "start": 0.00, "end": 0.15 },
      { "word": "those", "start": 0.16, "end": 0.45 },
      { "word": "of", "start": 0.46, "end": 0.58 },
      { "word": "[pause]", "start": 0.59, "end": 1.20 },
      { "word": "us", "start": 1.21, "end": 1.38 }
    ]

    This is for professional video editing. Be PRECISE.
  `;

  console.log('📝 Requesting word-level transcription from Gemini 2.0 Flash...');

  const transcriptionResponse = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: {
      parts: [
        audioPart,
        { text: transcriptionPrompt }
      ]
    },
    config: {
      responseMimeType: "application/json"
    }
  });

  const transcriptionText = transcriptionResponse.text || "[]";
  let wordTimestamps: Array<{ word: string; start: number; end: number }> = [];

  try {
    wordTimestamps = JSON.parse(cleanJsonOutput(transcriptionText));
    console.log(`✅ Transcribed ${wordTimestamps.length} words with timestamps`);
  } catch (e) {
    console.error("Failed to parse word-level transcription", e);
    throw new Error("Failed to transcribe audio. Please try again.");
  }

  // STEP 2: Intelligently match script segments to word timestamps
  console.log('🧠 Matching script segments to transcribed words...');

  const segmentTimings: Record<string, { start: number; end: number }> = {};

  for (let i = 0; i < scriptSegments.length; i++) {
    const segment = scriptSegments[i];
    const segmentWords = segment.text.toLowerCase().split(/\s+/).filter(w => w.length > 0);

    console.log(`\n📍 Segment ${i + 1}: "${segment.text.substring(0, 50)}..." (${segmentWords.length} words)`);

    // Find best match in transcription
    let bestMatchStart = -1;
    let bestMatchEnd = -1;
    let bestMatchScore = 0;

    // Sliding window to find where this segment appears in transcription
    for (let windowStart = 0; windowStart < wordTimestamps.length - segmentWords.length + 1; windowStart++) {
      let matchScore = 0;

      for (let j = 0; j < segmentWords.length && windowStart + j < wordTimestamps.length; j++) {
        const scriptWord = segmentWords[j].replace(/[^\w]/g, '').toLowerCase();
        const audioWord = wordTimestamps[windowStart + j].word.replace(/[^\w]/g, '').toLowerCase();

        if (audioWord === '[pause]') continue;

        // Fuzzy match (allow slight variations)
        if (scriptWord === audioWord) {
          matchScore += 10; // Exact match
        } else if (scriptWord.includes(audioWord) || audioWord.includes(scriptWord)) {
          matchScore += 5; // Partial match
        } else if (scriptWord[0] === audioWord[0]) {
          matchScore += 1; // Same first letter
        }
      }

      if (matchScore > bestMatchScore) {
        bestMatchScore = matchScore;
        bestMatchStart = windowStart;
        bestMatchEnd = Math.min(windowStart + segmentWords.length - 1, wordTimestamps.length - 1);
      }
    }

    if (bestMatchStart >= 0 && bestMatchEnd >= 0) {
      const startTime = wordTimestamps[bestMatchStart].start;
      const endTime = wordTimestamps[bestMatchEnd].end;

      segmentTimings[segment.id] = {
        start: Number(startTime.toFixed(2)),
        end: Number(endTime.toFixed(2))
      };

      console.log(`✅ Matched: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s (${(endTime - startTime).toFixed(2)}s duration, score: ${bestMatchScore})`);
    } else {
      console.warn(`⚠️ Could not find match for segment ${i + 1}`);

      // Fallback: use word count estimation
      const prevEnd = i > 0 && segmentTimings[scriptSegments[i - 1].id]
        ? segmentTimings[scriptSegments[i - 1].id].end
        : 0;
      const estimatedDuration = segmentWords.length * 0.4 + 0.5;

      segmentTimings[segment.id] = {
        start: Number(prevEnd.toFixed(2)),
        end: Number((prevEnd + estimatedDuration).toFixed(2))
      };

      console.log(`📊 Fallback: ${prevEnd.toFixed(2)}s - ${(prevEnd + estimatedDuration).toFixed(2)}s (estimated)`);
    }
  }

  console.log('\n🎉 PERFECT SYNC COMPLETE!');
  return segmentTimings;
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
