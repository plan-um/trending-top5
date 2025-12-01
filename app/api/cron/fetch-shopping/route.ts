import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchShoppingTrends } from '@/lib/shopping-trends';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Cron 인증 확인
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const isAuthorized =
      isVercelCron ||
      authHeader === `Bearer ${cronSecret}` ||
      !cronSecret;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching shopping trends...');

    // 쇼핑 트렌드 가져오기 (10개)
    const shoppingItems = await fetchShoppingTrends(10);

    if (shoppingItems.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No shopping trends fetched',
      });
    }

    // DB에 저장할 데이터 변환
    const trendsToSave = shoppingItems.map((item) => ({
      category: 'shopping',
      rank: item.rank,
      title: item.title,
      summary: item.description || null,
      source_url: item.link,
      source_name: item.sourceName,
      change_rate: null,
      metadata: {
        price: item.price,
        thumbnail: item.thumbnail,
      },
    }));

    // 기존 shopping 데이터 삭제
    const { error: deleteError } = await supabaseAdmin
      .from('trends')
      .delete()
      .eq('category', 'shopping');

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete old data' },
        { status: 500 }
      );
    }

    // 새 데이터 저장
    const { error: insertError } = await supabaseAdmin
      .from('trends')
      .insert(trendsToSave);

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to insert new data' },
        { status: 500 }
      );
    }

    console.log(`Successfully updated ${trendsToSave.length} shopping items`);

    return NextResponse.json({
      success: true,
      count: trendsToSave.length,
      items: trendsToSave.map((n) => n.title),
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
