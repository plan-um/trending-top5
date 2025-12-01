import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchTrendingKeywords } from '@/lib/google-trends';
import { generateSummary } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel 함수 최대 실행 시간

export async function GET(request: NextRequest) {
  try {
    // Cron 인증 확인 (Vercel Cron 또는 수동 호출)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Vercel Cron은 CRON_SECRET 헤더를 자동으로 추가
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const isAuthorized =
      isVercelCron ||
      authHeader === `Bearer ${cronSecret}` ||
      !cronSecret; // 개발 환경

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching Google Trends keywords...');

    // Google Trends에서 키워드 가져오기 (10개)
    const keywords = await fetchTrendingKeywords(10);

    if (keywords.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No keywords fetched',
      });
    }

    // AI 요약 생성 (이미 description이 있으면 사용, 없으면 생성)
    const trendsWithSummary = await Promise.all(
      keywords.map(async (keyword) => {
        // Gemini가 이미 reason을 제공했으면 그것을 사용
        const summary = keyword.description || await generateSummary(keyword.title);
        return {
          category: 'keyword',
          rank: keyword.rank,
          title: keyword.title,
          summary,
          source_url: keyword.link,
          source_name: 'Google News',
          change_rate: null,
          metadata: {
            traffic: keyword.traffic,
            relatedQueries: keyword.relatedQueries,
          },
        };
      })
    );

    // 기존 keyword 데이터 삭제
    const { error: deleteError } = await supabaseAdmin
      .from('trends')
      .delete()
      .eq('category', 'keyword');

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

    console.log(`Successfully updated ${trendsWithSummary.length} keywords`);

    return NextResponse.json({
      success: true,
      count: trendsWithSummary.length,
      keywords: trendsWithSummary.map((k) => k.title),
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
