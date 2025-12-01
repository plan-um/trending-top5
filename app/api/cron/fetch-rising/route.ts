import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchRisingTrends } from '@/lib/community-trends';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
    try {
        // Cron 인증
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

        console.log('Fetching rising trends from communities...');

        // 커뮤니티 트렌드 + 감정 분석
        const risingTrends = await fetchRisingTrends(10);

        if (risingTrends.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No rising trends found',
            });
        }

        // DB 저장 형태로 변환
        const trendsToSave = risingTrends.map(trend => ({
            category: 'rising',
            rank: trend.rank,
            title: trend.title,
            summary: trend.reason,
            source_url: trend.link,
            source_name: trend.source,
            change_rate: trend.viralScore, // 바이럴 점수를 change_rate에 저장
            metadata: {
                viralScore: trend.viralScore,
                sentimentType: trend.sentimentType,
                isNewToNews: trend.isNewToNews,
            },
        }));

        // 기존 rising 데이터 삭제
        const { error: deleteError } = await supabaseAdmin
            .from('trends')
            .delete()
            .eq('category', 'rising');

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

        console.log(`Successfully saved ${trendsToSave.length} rising trends`);

        return NextResponse.json({
            success: true,
            count: trendsToSave.length,
            items: risingTrends.map(t => ({
                title: t.title,
                score: t.viralScore,
                sentiment: t.sentimentType,
            })),
        });

    } catch (error) {
        console.error('Rising trends cron error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
