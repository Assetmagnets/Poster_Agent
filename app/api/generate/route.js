import { NextResponse } from 'next/server';
import { fetchAllNews } from '@/lib/feeds';
import { analyzeWithGemini } from '@/lib/gemini';
import { generateImageUrl } from '@/lib/images';
import { savePostersToDB } from '@/lib/db';

// Vercel serverless function config
export const maxDuration = 60; // Allow up to 60 seconds (requires Vercel Pro for >10s)
export const dynamic = 'force-dynamic';

// In-memory store for generated posters (persists during the serverless function lifecycle)
// For Vercel, we use the response itself to pass data to the client
const MAX_POSTERS = 5;

export async function GET(request) {
  try {
    console.log('Starting poster generation...');

    // 1. Fetch all news
    const items = await fetchAllNews();
    console.log(`Fetched ${items.length} news items`);

    // 2. Analyze and filter with Gemini
    const posters = [];
    const seenTitles = new Set();

    for (const item of items) {
      if (posters.length >= MAX_POSTERS) break;

      try {
        const analysis = await analyzeWithGemini(item);

        if (!analysis.relevant) {
          console.log(`Skipped: ${item.title} (${analysis.reason})`);
          continue;
        }

        // Skip near-duplicates
        const normalizedTitle = analysis.headline.toLowerCase().trim();
        if (seenTitles.has(normalizedTitle)) continue;
        seenTitles.add(normalizedTitle);

        console.log(`Processing: ${analysis.headline}`);

        // 3. Generate AI image URL
        const imageUrl = await generateImageUrl(analysis.headline, analysis.summary);

        posters.push({
          id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          headline: analysis.headline,
          summary: analysis.summary,
          caption: analysis.caption,
          source: item.sourceName || 'Odisha News',
          date: item.pubDate || new Date().toISOString(),
          imageUrl: imageUrl,
          link: item.link,
          createdAt: new Date().toISOString()
        });

      } catch (err) {
        console.error(`Error processing item: ${item.title}`, err.message);
      }
    }

    console.log(`Generated ${posters.length} posters`);

    // Save newly generated posters to Upstash Redis database
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
