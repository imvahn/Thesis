import { NextResponse } from 'next/server';
import { loadAllSamples } from '@/components/DatabaseStuff';

export async function GET(request: Request) {
  try {
    const result = await loadAllSamples();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Error loading samples" }, { status: 500 });
  }
}
