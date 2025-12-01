import { NextRequest, NextResponse } from 'next/server';
import { supabase, TrendCategory, Trend } from '@/lib/supabase';
import { TrendResponse, TrendItem, CATEGORY_LABELS } from '@/types/trend';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as TrendCategory | null;

    if (category && !['keyword', 'social', 'content', 'shopping', 'rising'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    const categories: TrendCategory[] = category
      ? [category]
      : ['keyword', 'social', 'content', 'shopping', 'rising'];

    const results: Record<string, TrendResponse> = {};

    for (const cat of categories) {
      const { data, error } = await supabase
        .from('trends')
        .select('*')
        .eq('category', cat)
        .order('rank', { ascending: true })
        .limit(10);

      if (error) {
        console.error(`Error fetching ${cat} trends:`, error);
        results[cat] = {
          category: cat,
          categoryLabel: CATEGORY_LABELS[cat],
          updatedAt: null,
          items: [],
        };
        continue;
      }

      const items: TrendItem[] = (data || []).map((trend: Trend) => ({
        id: trend.id,
        rank: trend.rank,
        title: trend.title,
        summary: trend.summary,
        sourceUrl: trend.source_url,
        sourceName: trend.source_name || '',
        changeRate: trend.change_rate,
        thumbnail: (trend.metadata as Record<string, string>)?.thumbnail,
        metadata: (trend.metadata as Record<string, any>) || {},
        updatedAt: trend.updated_at,
      }));

      const latestUpdate = items.length > 0 ? items[0].updatedAt : null;

      results[cat] = {
        category: cat,
        categoryLabel: CATEGORY_LABELS[cat],
        updatedAt: latestUpdate,
        items,
      };
    }

    // 단일 카테고리 요청 시 해당 카테고리만 반환
    if (category) {
      return NextResponse.json(results[category]);
    }

    // 전체 카테고리 반환
    return NextResponse.json({
      trends: results,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
