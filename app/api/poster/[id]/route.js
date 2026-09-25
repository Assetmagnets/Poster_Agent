import { NextResponse } from 'next/server';
import { deletePosterFromDB } from '@/lib/db';

export async function DELETE(request, { params }) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ success: false, error: 'No ID provided' }, { status: 400 });
  }

  try {
    const success = await deletePosterFromDB(id);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Failed to delete from DB' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
