import { NextRequest, NextResponse } from 'next/server';
import { generateSummary } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, context } = body;

    if (!keyword || typeof keyword !== 'string') {
      return NextResponse.json(
        { error: 'keyword is required' },
        { status: 400 }
      );
    }

    const summary = await generateSummary(keyword, context);

    if (!summary) {
      return NextResponse.json(
        { error: 'Failed to generate summary' },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('AI summarize error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
