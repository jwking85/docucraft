// Free image generation using Unsplash API
// Unsplash provides high-quality stock photos based on search queries

const UNSPLASH_ACCESS_KEY = 'YOUR_UNSPLASH_ACCESS_KEY'; // Users can get free key at unsplash.com/developers

/**
 * Search Unsplash for images matching the prompt
 * Free tier: 50 requests/hour
 */
export const searchUnsplashImages = async (query: string, count: number = 1): Promise<string[]> => {
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('No images found for this prompt');
    }

    // Return regular quality URLs (not full resolution to save bandwidth)
    return data.results.map((photo: any) => photo.urls.regular);
  } catch (error: any) {
    console.error('Unsplash search failed:', error);
    throw new Error(error.message || 'Failed to search for images');
  }
};

/**
 * Extract keywords from visual prompt for better search results
 */
const extractKeywords = (prompt: string): string => {
  // Remove common AI prompt terms and keep important subjects
  const stopWords = ['cinematic', 'professional', 'high quality', 'detailed', 'photorealistic', 'lighting', 'composition', 'wide shot', 'close up', 'establishing shot'];

  let cleaned = prompt.toLowerCase();
  stopWords.forEach(word => {
    cleaned = cleaned.replace(new RegExp(word, 'gi'), '');
  });

  // Extract first 3-4 meaningful words
  const words = cleaned.trim().split(' ').filter(w => w.length > 3);
  return words.slice(0, 4).join(' ');
};

/**
 * Generate image using Unsplash search
 */
export const generateImageViaUnsplash = async (prompt: string): Promise<string> => {
  const keywords = extractKeywords(prompt);
  const images = await searchUnsplashImages(keywords, 1);
  return images[0];
};

/**
 * Fallback: Use Lorem Picsum for random placeholder images
 * No API key required, completely free
 */
export const generatePlaceholderImage = async (width: number = 1920, height: number = 1080): Promise<string> => {
  // Lorem Picsum provides random images from Unsplash without authentication
  return `https://picsum.photos/${width}/${height}?random=${Date.now()}`;
};
