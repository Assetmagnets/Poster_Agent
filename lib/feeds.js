import * as cheerio from 'cheerio';

const RSS_URL = 'https://news.google.com/rss/search?q=Odisha+business+OR+industry+OR+mining+OR+steel+when:1d&hl=en-IN&gl=IN&ceid=IN:en';

export async function fetchAllNews() {
  let allItems = [];

  // 1. Fetch RSS feed
  try {
    const rssItems = await fetchRSS();
    allItems = allItems.concat(rssItems);
    console.log(`RSS fetched ${rssItems.length} items`);
  } catch (err) {
    console.error('Failed to fetch RSS feed', err.message);
  }

  // 2. Scrape Bing News with cheerio (no Puppeteer!)
  try {
    const scrapedItems = await scrapeBingNews('Odisha Business');
    allItems = allItems.concat(scrapedItems);
    console.log(`Bing scrape found ${scrapedItems.length} items`);
  } catch (err) {
    console.error('Failed to scrape Bing News', err.message);
  }

  // 3. Filter by age (last 24 hours)
  const now = new Date();
  const maxAgeMs = 24 * 60 * 60 * 1000;

  allItems = allItems.filter(item => {
    if (!item.pubDate) return true;
    const pub = new Date(item.pubDate);
    if (isNaN(pub)) return true;
    return (now - pub) <= maxAgeMs;
  });

  return allItems;
}

async function fetchRSS() {
  // Use dynamic import for rss-parser since it's a CJS module
  const Parser = (await import('rss-parser')).default;
  const parser = new Parser({
    customFields: {
      item: ['contentSnippet', 'pubDate', 'link', 'id', 'guid']
    }
  });

  const feedData = await parser.parseURL(RSS_URL);

  return feedData.items.map(item => ({
    id: item.guid || item.id || item.link,
    title: item.title || '',
    link: item.link || '',
    sourceName: 'Google News',
    pubDate: item.pubDate || new Date().toISOString(),
    contentSnippet: item.contentSnippet || ''
  }));
}

async function scrapeBingNews(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://www.bing.com/news/search?q=${encodedQuery}&qft=interval%3D"7"`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Bing returned ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const articles = [];

  $('div.news-card').each((i, el) => {
    const titleEl = $(el).find('a.title');
    const sourceEl = $(el).find('.source');
    const snippetEl = $(el).find('.snippet');

    const title = titleEl.text().trim();
    const link = titleEl.attr('href');

    if (!title || !link) return;

    articles.push({
      id: link,
      title: title,
      link: link,
      sourceName: sourceEl.text().trim() || 'Bing News',
      pubDate: new Date().toISOString(),
      contentSnippet: snippetEl.text().trim() || ''
    });
  });

  return articles;
}
