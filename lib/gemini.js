const KEYWORDS = [
  "odisha", "bhubaneswar", "cuttack", "paradeep", "rourkela",
  "angul", "jajpur", "keonjhar", "sundargarh", "nalco", "imfa",
  "mining", "steel", "aluminium", "vedanta", "tata steel", "posco", "jspl"
];

export async function analyzeWithGemini(item) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  if (!apiKey) {
    return analyzeRuleBased(item);
  }

  const title = item.title || '';
  const snippet = item.contentSnippet || '';

  const prompt = `
You are a news editor for Odisha Business News.
Analyze the following news item and determine if it is relevant to business, industry, mining, tech, or economy in Odisha, India.
If it is NOT relevant, set "relevant" to false and return.
If it IS relevant, rewrite the headline and summary using ONLY information from the provided text (do not fabricate facts).
- Headline max 12 words.
- Summary max 30 words.
- Instagram caption: exactly 2 sentences summarizing the news, followed by exactly 5 relevant hashtags.
Return JSON output only, no markdown formatting.

Title: ${title}
Snippet: ${snippet}

Expected JSON format:
{
  "relevant": boolean,
  "headline": string,
  "summary": string,
  "caption": string,
  "reason": string (if not relevant)
}
`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResult) {
      throw new Error('No text in Gemini response');
    }

    textResult = textResult.replace(/^```json/g, '').replace(/```$/g, '').trim();
    const parsed = JSON.parse(textResult);

    if (typeof parsed.relevant !== 'boolean') throw new Error('Invalid schema');

    if (parsed.relevant) {
      if (!parsed.headline || !parsed.summary || !parsed.caption) {
        throw new Error('Missing required fields for relevant item');
      }
    }

    return parsed;
  } catch (err) {
    console.error('Gemini AI failed, falling back to rule-based analyzer.', err.message);
    return analyzeRuleBased(item);
  }
}

function analyzeRuleBased(item) {
  const title = item.title || '';
  const snippet = item.contentSnippet || '';
  const fullText = (title + ' ' + snippet).toLowerCase();

  const isRelevant = KEYWORDS.some(kw => fullText.includes(kw.toLowerCase()));
  if (!isRelevant) {
    return { relevant: false, reason: 'No matching keywords' };
  }

  let cleanTitle = title.replace(/\s*-\s*.*$/, '');
  let cleanSnippet = snippet.replace(/<[^>]*>?/gm, '');

  if (cleanTitle.length > 110) cleanTitle = cleanTitle.substring(0, 107) + '...';
  if (cleanSnippet.length > 160) cleanSnippet = cleanSnippet.substring(0, 157) + '...';

  const caption = `${cleanTitle}.\n\n${cleanSnippet}\n\n#Odisha #OdishaBusiness #OdishaNews #Industry #Development`;

  return {
    relevant: true,
    headline: cleanTitle,
    summary: cleanSnippet,
    caption: caption
  };
}
