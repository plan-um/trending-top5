import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAllTrends } from '@/lib/supabase';
import { calculateOverallRanking, generateMetaAnalysis } from '@/lib/trend-analyzer';

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

        console.log('Analyzing overall trends...');

        // 1. 모든 카테고리 데이터 가져오기
        const allTrends = await getAllTrends();
        console.log('Fetched trends for analysis:', JSON.stringify(allTrends, null, 2));

        // 2. 종합 랭킹 계산
        const overallItems = await calculateOverallRanking(allTrends);
        console.log('Calculated overall items:', overallItems.length);

        if (overallItems.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No trends to analyze',
            });
        }

        // 3. 메타 분석 생성 (1위 아이템의 summary 필드에 저장하거나 별도 메타데이터로 저장)
        // 여기서는 1위의 summary를 메타 분석으로 덮어쓰거나, 별도 필드가 없으므로 
        // "종합 분석"이라는 가상의 0위 아이템을 만들 수도 있지만,
        // UI 복잡도를 낮추기 위해 1위 아이템의 summary에 "전체 흐름"을 적는 방식을 택하거나
        // 각 아이템의 요약은 유지하고, 클라이언트에서 별도로 보여줄 수 있게 metadata에 저장.

        const metaAnalysis = await generateMetaAnalysis(overallItems);

        // 메타 분석을 1위 아이템의 metadata에 저장
        if (overallItems[0]) {
            overallItems[0].metadata = {
                ...overallItems[0].metadata,
                metaAnalysis,
            };
        }

        // 4. DB 저장
        const trendsToSave = overallItems.map(item => ({
            category: 'overall',
            rank: item.rank,
            title: item.title,
            summary: item.summary, // 개별 요약 유지
            source_url: item.sourceUrl,
            source_name: item.sourceName,
            change_rate: item.changeRate || null,
            metadata: item.metadata || {},
        }));

        // 기존 overall 데이터 삭제
        await supabaseAdmin.from('trends').delete().eq('category', 'overall');

        // 새 데이터 저장
        const { error } = await supabaseAdmin.from('trends').insert(trendsToSave);

        if (error) {
            throw error;
        }

        console.log(`Successfully analyzed and saved ${overallItems.length} overall items`);

        return NextResponse.json({
            success: true,
            count: overallItems.length,
            metaAnalysis,
            items: overallItems.map(i => i.title),
        });

    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
