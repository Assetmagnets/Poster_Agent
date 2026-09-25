import { NextResponse } from 'next/server';
import { fetchAllNews } from '@/lib/feeds';
import { analyzeWithGemini } from '@/lib/gemini';
import { generateImageUrl } from '@/lib/images';
import { savePostersToDB } from '@/lib/db';

// Vercel serverless function config
export const maxDuration = 10; // Hobby plan limit
export const dynamic = 'force-dynamic';

const MAX_POSTERS = 3; // Reduced from 5 to stay within timeout

export async function GET(request) {
  try {
    console.log('Starting poster generation...');

    // 1. Fetch all news
    const items = await fetchAllNews();
    console.log(`Fetched ${items.length} news items`);

    // 2. Analyze with Gemini in parallel (batch of first 8 items)
    const batch = items.slice(0, 8);
    const analyses = await Promise.allSettled(
      batch.map(item => analyzeWithGemini(item).then(analysis => ({ item, analysis })))
    );

    // 3. Filter relevant items and generate images in parallel
    const relevant = [];
    const seenTitles = new Set();

    for (const result of analyses) {
      if (relevant.length >= MAX_POSTERS) break;
      if (result.status !== 'fulfilled') continue;

      const { item, analysis } = result.value;
      if (!analysis.relevant) continue;

      const normalizedTitle = analysis.headline.toLowerCase().trim();
      if (seenTitles.has(normalizedTitle)) continue;
      seenTitles.add(normalizedTitle);

      relevant.push({ item, analysis });
    }

    // Generate all image URLs in parallel
    const imageResults = await Promise.allSettled(
      relevant.map(({ analysis }) => generateImageUrl(analysis.headline, analysis.summary))
    );

    const posters = relevant.map(({ item, analysis }, i) => {
      const imgResult = imageResults[i].status === 'fulfilled'
        ? imageResults[i].value
        : { imageUrl: 'https://placehold.co/1080x720/0a0e1a/fbbf24.png?text=Image+Unavailable', searchKeywords: '' };

      return {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        headline: analysis.headline,
        summary: analysis.summary,
        caption: analysis.caption,
        source: item.sourceName || 'Odisha News',
        date: item.pubDate || new Date().toISOString(),
        imageUrl: imgResult.imageUrl,
        searchKeywords: imgResult.searchKeywords || '',
        link: item.link,
        createdAt: new Date().toISOString()
      };
    });

    console.log(`Generated ${posters.length} posters`);

    // Save to database
    if (posters.length > 0) {
      await savePostersToDB(posters);
    }

    return NextResponse.json({
      success: true,
      count: posters.length,
      posters: posters,
      generatedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('Generate API error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// Also support POST for cron triggers
export async function POST(request) {
  return GET(request);
}
