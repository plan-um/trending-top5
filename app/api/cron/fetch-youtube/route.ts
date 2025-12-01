import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchTrendingVideos } from '@/lib/youtube';
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

    console.log('Fetching YouTube trending videos...');

    // YouTube 인기 동영상 가져오기 (10개)
    const videos = await fetchTrendingVideos(10);

    if (videos.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No videos fetched',
      });
    }

    // AI 요약 생성 (채널명을 컨텍스트로 제공)
    const trendsWithSummary = await Promise.all(
      videos.map(async (video) => {
        const summary = await generateSummary(
          video.title,
          `YouTube 채널: ${video.channelTitle}, 조회수: ${video.viewCount || '정보 없음'}`
        );
        return {
          category: 'content',
          rank: video.rank,
          title: video.title,
          summary,
          source_url: video.link,
          source_name: video.channelTitle,
          change_rate: null,
          metadata: {
            videoId: video.videoId,
            thumbnail: video.thumbnail,
            viewCount: video.viewCount,
            channelTitle: video.channelTitle,
          },
        };
      })
    );

    // 기존 content 데이터 삭제
    const { error: deleteError } = await supabaseAdmin
      .from('trends')
      .delete()
      .eq('category', 'content');

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

    console.log(`Successfully updated ${trendsWithSummary.length} videos`);

    return NextResponse.json({
      success: true,
      count: trendsWithSummary.length,
      videos: trendsWithSummary.map((v) => v.title),
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
