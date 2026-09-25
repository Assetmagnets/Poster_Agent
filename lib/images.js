/**
 * Multi-fallback image system with Pexels as primary.
 * 
 * Chain:
 * 1. Pexels API (keyword-matched HD stock photos — fast & reliable)
 * 2. Pollinations AI (AI-generated image — when available)
 * 3. CSS gradient (final fallback, handled client-side)
 * 
 * Gemini extracts simple search keywords from the headline,
 * which Pexels uses to find a perfectly matching stock photo.
 */

export async function generateImageUrl(headline, summary) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  let searchKeywords = headline.split(' ').slice(0, 3).join(' ');
  let imagePrompt = headline;

  // Step 1: Use Gemini to extract good search keywords
  if (apiKey) {
    try {
      const prompt = `
You are an expert at finding stock photos for news articles.

Given this news headline, provide TWO things:

1. KEYWORDS: 2-3 simple English words to search for a stock photo that matches the news topic. Be specific and visual. Examples:
   - "Odisha Mining Revenue" → "mining quarry excavator"
   - "Silver Rate Today" → "silver bars coins"  
   - "Investment Pipeline Cleared" → "business investment cityscape"
   - "Semiconductor Factory" → "semiconductor chip factory"
   - "Heavy Rainfall Odisha" → "heavy rain flooding"

2. IMAGE_PROMPT: A short (under 25 words) image description for AI image generation. Photorealistic, cinematic. NO text in image.

Headline: ${headline}
Summary: ${summary}

Respond in EXACT format:
KEYWORDS: <keywords>
IMAGE_PROMPT: <prompt>
`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResult) {
          const keywordsMatch = textResult.match(/KEYWORDS:\s*(.+)/i);
          if (keywordsMatch) searchKeywords = keywordsMatch[1].trim();

          const promptMatch = textResult.match(/IMAGE_PROMPT:\s*(.+)/i);
          if (promptMatch) imagePrompt = promptMatch[1].trim();
        }
      }
    } catch (err) {
      console.error('Gemini keyword extraction error:', err.message);
    }
  }

  // Step 2: Try Pexels (primary — fast, reliable, keyword-matched HD photos)
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const pexelsUrl = await searchPexels(pexelsKey, searchKeywords);
      if (pexelsUrl) {
        console.log('✅ Pexels OK:', searchKeywords, '→', pexelsUrl.substring(0, 60));
        return { imageUrl: pexelsUrl, searchKeywords };
      }
    } catch (err) {
      console.error('⚠️ Pexels failed:', err.message);
    }
  }

  // Step 3: Try Pollinations AI (fallback — may be slow or down)
  const encodedPrompt = encodeURIComponent(imagePrompt);
  const seed = Math.floor(Math.random() * 100000);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=720&nologo=true&seed=${seed}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const checkRes = await fetch(pollinationsUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (checkRes.ok) {
      console.log('✅ Pollinations OK');
      return { imageUrl: pollinationsUrl, searchKeywords };
    }
  } catch (err) {
    console.log('⚠️ Pollinations unreachable:', err.message);
  }

  // Step 4: Return Pollinations URL anyway (client will show gradient if it fails)
  return { imageUrl: pollinationsUrl, searchKeywords };
}

/**
 * Search Pexels for a relevant landscape photo.
 * Returns the "landscape" crop URL (1200x627) or null.
 */
async function searchPexels(apiKey, keywords) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  const query = encodeURIComponent(keywords);
  const url = `https://api.pexels.com/v1/search?query=${query}&per_page=5&orientation=landscape`;

  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!res.ok) return null;

  const data = await res.json();
  if (!data.photos || data.photos.length === 0) return null;

  // Pick a random photo from the top results for variety
  const photo = data.photos[Math.floor(Math.random() * data.photos.length)];

  // Use the "landscape" crop (1200x627) — perfect aspect ratio for posters
  return photo.src?.landscape || photo.src?.large || photo.src?.original;
}
