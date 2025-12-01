import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchSocialTrends } from '@/lib/social-trends';
import { generateSummary } from '@/lib/gemini';

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

    console.log('Fetching social trends...');

    // 소셜 트렌드 가져오기 (10개)
    const socialItems = await fetchSocialTrends(10);

    if (socialItems.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No social trends fetched',
      });
    }

    // AI 요약 생성 (이미 description이 있으면 사용)
    const trendsWithSummary = await Promise.all(
      socialItems.map(async (item) => {
        // Gemini가 이미 reason을 제공했으면 그것을 사용
        const summary = item.description || await generateSummary(item.title);
        return {
          category: 'social',
          rank: item.rank,
          title: item.title,
          summary,
          source_url: item.link,
          source_name: item.sourceName,
          change_rate: null,
          metadata: {
            description: item.description,
          },
        };
      })
    );

    // 기존 social 데이터 삭제
    const { error: deleteError } = await supabaseAdmin
      .from('trends')
      .delete()
      .eq('category', 'social');

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
      .insert(trendsWithSummary);

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to insert new data' },
        { status: 500 }
      );
    }

    console.log(`Successfully updated ${trendsWithSummary.length} social items`);

    return NextResponse.json({
      success: true,
      count: trendsWithSummary.length,
      items: trendsWithSummary.map((n) => n.title),
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
