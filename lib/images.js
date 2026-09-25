export async function generateImageUrl(headline, summary) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  let imagePrompt = `Cinematic, hyper-realistic, dramatic lighting, modern business concept for: ${headline}`;

  if (apiKey) {
    try {
      const prompt = `
You are an expert news illustrator. Your goal is to create a highly accurate, meaningful, and easy-to-understand visual representation of the following news article.

First, identify the CORE SUBJECT of the news (e.g., agriculture, mining, semiconductor factory, heavy rain, political meeting).
Then, write a short, highly descriptive image generation prompt (under 40 words) that directly visualizes this subject in a clear, literal, and impactful way.
- The image must clearly convey the meaning of the headline.
- Focus on photorealistic, high-quality, and professional documentary photography style.
- DO NOT include text, words, or letters in the image prompt.
- Make it cinematic and vibrant (e.g., "4k, highly detailed, dramatic lighting").

Headline: ${headline}
Summary: ${summary}

Return ONLY the image prompt text, no markdown.
`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

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
          imagePrompt = textResult.trim();
        }
      }
    } catch (err) {
      console.error('Failed to generate image prompt with Gemini', err.message);
    }
  }

  // Return the Pollinations URL directly (no download/base64 — much faster!)
  const encodedPrompt = encodeURIComponent(imagePrompt);
  const seed = Math.floor(Math.random() * 1000000);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=720&nologo=true&seed=${seed}`;
}
