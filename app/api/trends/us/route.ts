import { NextRequest, NextResponse } from 'next/server';
import {
  fetchUSNewsTrends,
  fetchUSSocialTrends,
  fetchUSShoppingTrends,
  fetchUSContentTrends,
  fetchUSRisingTrends,
} from '@/lib/trends-us';
import { CATEGORY_LABELS_BY_LOCALE } from '@/lib/locale';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

// In-memory cache for US trends (since we don't have separate DB tables)
let usCache: {
  data: Record<string, any> | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Check cache
    const now = Date.now();
    if (!forceRefresh && usCache.data && now - usCache.timestamp < CACHE_DURATION) {
      if (category && usCache.data[category]) {
        return NextResponse.json(usCache.data[category]);
      }
      return NextResponse.json({
        trends: usCache.data,
        lastUpdated: new Date(usCache.timestamp).toISOString(),
      });
    }

    // Fetch fresh data
    console.log('Fetching fresh US trends...');

    const [newsItems, socialItems, shoppingItems, contentItems, risingItems] = await Promise.all([
      fetchUSNewsTrends(10),
      fetchUSSocialTrends(10),
      fetchUSShoppingTrends(10),
      fetchUSContentTrends(10),
      fetchUSRisingTrends(10),
    ]);

    const labels = CATEGORY_LABELS_BY_LOCALE.us;
    const timestamp = new Date().toISOString();

    const results: Record<string, any> = {
      keyword: {
        category: 'keyword',
        categoryLabel: labels.keyword,
        updatedAt: timestamp,
        items: newsItems.map(item => ({
          ...item,
          sourceUrl: item.link,
          summary: item.description || null,
          updatedAt: timestamp,
        })),
      },
      social: {
        category: 'social',
        categoryLabel: labels.social,
        updatedAt: timestamp,
        items: socialItems.map(item => ({
          ...item,
          sourceUrl: item.link,
          summary: item.description || null,
          updatedAt: timestamp,
        })),
      },
      shopping: {
        category: 'shopping',
        categoryLabel: labels.shopping,
        updatedAt: timestamp,
        items: shoppingItems.map(item => ({
          ...item,
          sourceUrl: item.link,
          summary: item.description || null,
          updatedAt: timestamp,
        })),
      },
      content: {
        category: 'content',
        categoryLabel: labels.content,
        updatedAt: timestamp,
        items: contentItems.map(item => ({
          ...item,
          sourceUrl: item.link,
          summary: item.description || null,
          updatedAt: timestamp,
        })),
      },
      rising: {
        category: 'rising',
        categoryLabel: labels.rising,
        updatedAt: timestamp,
        items: risingItems.map(item => ({
          ...item,
          sourceUrl: item.link,
          summary: item.description || null,
          updatedAt: timestamp,
        })),
      },
    };

    // Update cache
    usCache = {
      data: results,
      timestamp: now,
    };

    if (category && results[category]) {
      return NextResponse.json(results[category]);
    }

    return NextResponse.json({
      trends: results,
      lastUpdated: timestamp,
    });
  } catch (error) {
    console.error('US API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
