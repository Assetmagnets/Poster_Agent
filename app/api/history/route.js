import { NextResponse } from 'next/server';
import { getPostersFromDB } from '@/lib/db';

export async function GET() {
  try {
    const posters = await getPostersFromDB();
    
    return NextResponse.json({
      success: true,
      posters: posters,
      count: posters.length
    });
  } catch (err) {
    console.error('History API error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
