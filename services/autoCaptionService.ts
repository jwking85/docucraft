import { GoogleGenAI } from "@google/genai";

/**
 * AUTO-CAPTIONING SERVICE
 * Generates SRT captions from audio using Gemini AI speech recognition
 * Makes videos accessible and boosts YouTube SEO
 */

export interface Caption {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * Convert seconds to SRT timestamp format (00:00:00,000)
 */
const formatSRTTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

/**
 * Generate captions from audio file using AI
 */
export const generateCaptionsFromAudio = async (audioFile: File): Promise<Caption[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Captioning requires Gemini API access.");
  }

  console.log('🎤 Generating captions from audio...');

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Convert audio file to base64
  const base64Audio = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioFile);
  });

  const mimeType = audioFile.type || 'audio/wav';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Audio,
              mimeType: mimeType
            }
          },
          {
            text: `You are a professional transcriptionist. Transcribe this audio with precise timestamps.

IMPORTANT RULES:
1. Return a JSON array of caption segments
2. Each segment should be 3-7 seconds long (optimal for readability)
3. Break at natural speech pauses (end of sentences, breathing)
4. Include punctuation and capitalization
5. Each segment max 2 lines (about 42 characters per line)

Format:
[
  {
    "start": 0.0,
    "end": 3.5,
    "text": "For those of us who grew up in the late '80s and '90s,"
  },
  {
    "start": 3.5,
    "end": 6.8,
    "text": "Nickelodeon wasn't just a TV channel."
  }
]

Return ONLY the JSON array, no markdown formatting.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "[]";
    const cleanedText = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const segments = JSON.parse(cleanedText);

    // Convert to Caption format
    return segments.map((seg: any, idx: number) => ({
      id: idx + 1,
      startTime: seg.start || 0,
      endTime: seg.end || seg.start + 3,
      text: seg.text || ''
    }));

  } catch (error: any) {
    console.error('Caption generation error:', error);
    throw new Error(`Failed to generate captions: ${error.message}`);
  }
};

/**
 * Export captions to SRT file format
 */
export const exportToSRT = (captions: Caption[]): string => {
  return captions.map(cap => {
    return `${cap.id}\n${formatSRTTime(cap.startTime)} --> ${formatSRTTime(cap.endTime)}\n${cap.text}\n`;
  }).join('\n');
};

/**
 * Generate captions from script text with timing info
 * Fallback when audio transcription isn't available
 */
export const generateCaptionsFromScript = (
  scriptSegments: { text: string; startTime: number; endTime: number }[]
): Caption[] => {
  return scriptSegments.map((seg, idx) => ({
    id: idx + 1,
    startTime: seg.startTime,
    endTime: seg.endTime,
    text: seg.text
  }));
};

/**
 * Smart caption splitting for readability
 * Splits long text into 2-line captions with natural breaks
 */
export const splitLongCaption = (text: string, maxCharsPerLine: number = 42): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  // Limit to 2 lines for readability
  if (lines.length > 2) {
    return [lines.slice(0, 2).join('\n')];
  }

  return lines;
};
