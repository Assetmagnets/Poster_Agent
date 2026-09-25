import { neon } from '@neondatabase/serverless';

let sql = null;

const initDb = () => {
  if (sql) return sql;
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return null;
  }
  sql = neon(dbUrl);
  return sql;
};

// Create table if it doesn't exist
async function ensureTableExists(db) {
  try {
    await db`
      CREATE TABLE IF NOT EXISTS posters (
        id VARCHAR(255) PRIMARY KEY,
        headline TEXT NOT NULL,
        summary TEXT,
        caption TEXT,
        source VARCHAR(255),
        date TIMESTAMP,
        image_url TEXT,
        link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
  } catch (e) {
    console.error('Failed to create table:', e);
  }
}

export async function savePostersToDB(newPosters) {
  const db = initDb();
  if (!db) {
    console.warn('Neon DATABASE_URL not configured. Skipping DB save.');
    return;
  }

  await ensureTableExists(db);

  try {
    // Insert each poster
    for (const poster of newPosters) {
      await db`
        INSERT INTO posters (id, headline, summary, caption, source, date, image_url, link)
        VALUES (
          ${poster.id}, 
          ${poster.headline}, 
          ${poster.summary}, 
          ${poster.caption}, 
          ${poster.source}, 
          ${new Date(poster.date).toISOString()}, 
          ${poster.imageUrl}, 
          ${poster.link || ''}
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }
    console.log(`Saved ${newPosters.length} posters to Neon DB.`);
  } catch (err) {
    console.error('Failed to save to Neon DB', err);
  }
}

export async function getPostersFromDB() {
  const db = initDb();
  if (!db) return [];

  await ensureTableExists(db);

  try {
    const rows = await db`SELECT * FROM posters ORDER BY created_at DESC LIMIT 100`;
    
    // Map snake_case back to camelCase
    return rows.map(row => ({
      id: row.id,
      headline: row.headline,
      summary: row.summary,
      caption: row.caption,
      source: row.source,
      date: row.date,
      imageUrl: row.image_url,
      link: row.link,
      createdAt: row.created_at
    }));
  } catch (err) {
    console.error('Failed to fetch from Neon DB', err);
    return [];
  }
}

export async function deletePosterFromDB(id) {
  const db = initDb();
  if (!db) return false;

  try {
    await db`DELETE FROM posters WHERE id = ${id}`;
    return true;
  } catch (err) {
    console.error('Failed to delete from Neon DB', err);
    return false;
  }
}
