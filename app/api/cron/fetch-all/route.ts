import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchTrendingKeywords } from '@/lib/google-trends';
import { fetchSocialTrends } from '@/lib/social-trends';
import { fetchTrendingVideos } from '@/lib/youtube';
import { fetchShoppingTrends } from '@/lib/shopping-trends';
import { fetchRisingTrends } from '@/lib/community-trends';
import { generateSummary } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Helper: DELETE existing category data and INSERT new data
async function replaceCategory(category: string, trends: Record<string, unknown>[]) {
    // Delete existing data for this category
    const { error: deleteError } = await supabaseAdmin
        .from('trends')
        .delete()
        .eq('category', category);

    if (deleteError) {
        console.error(`Error deleting ${category}:`, deleteError);
        throw deleteError;
    }

    // Insert new data
    const { error: insertError } = await supabaseAdmin
        .from('trends')
        .insert(trends);

    if (insertError) {
        console.error(`Error inserting ${category}:`, insertError);
        throw insertError;
    }

    return trends.length;
}

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: Record<string, number> = {};

    try {
        // 1. Keyword trends
        console.log('Fetching keyword trends...');
        const keywords = await fetchTrendingKeywords(10);
        const keywordTrends = await Promise.all(
            keywords.map(async (keyword) => ({
                category: 'keyword',
                rank: keyword.rank,
                title: keyword.title,
                summary: keyword.description || await generateSummary(keyword.title),
                source_url: keyword.link,
                source_name: 'Google News',
                change_rate: null,
                metadata: {
                    traffic: keyword.traffic,
                    relatedQueries: keyword.relatedQueries,
                },
            }))
        );
        results.keyword = await replaceCategory('keyword', keywordTrends);

        // 2. Social trends
        console.log('Fetching social trends...');
        const socialItems = await fetchSocialTrends(10);
        const socialTrends = await Promise.all(
            socialItems.map(async (item) => ({
                category: 'social',
                rank: item.rank,
                title: item.title,
                summary: await generateSummary(item.title, item.description || item.title),
                source_url: item.link,
                source_name: item.sourceName,
                change_rate: null,
                metadata: { description: item.description },
            }))
        );
        results.social = await replaceCategory('social', socialTrends);

        // 3. Content trends (YouTube)
        console.log('Fetching content trends...');
        const videos = await fetchTrendingVideos(10);
        const contentTrends = await Promise.all(
            videos.map(async (video) => ({
                category: 'content',
                rank: video.rank,
                title: video.title,
                summary: await generateSummary(video.title, `YouTube: ${video.channelTitle}`),
                source_url: video.link,
                source_name: video.channelTitle,
                change_rate: null,
                metadata: {
                    videoId: video.videoId,
                    thumbnail: video.thumbnail,
                    viewCount: video.viewCount,
                    channelTitle: video.channelTitle,
                },
            }))
        );
        results.content = await replaceCategory('content', contentTrends);

        // 4. Shopping trends
        console.log('Fetching shopping trends...');
        const shoppingItems = await fetchShoppingTrends(10);
        const shoppingTrends = shoppingItems.map(item => ({
            category: 'shopping',
            rank: item.rank,
            title: item.title,
            summary: item.description || null,
            source_url: item.link,
            source_name: item.sourceName,
            change_rate: null,
            metadata: { price: item.price, thumbnail: item.thumbnail },
        }));
        results.shopping = await replaceCategory('shopping', shoppingTrends);

        // 5. Rising trends
        console.log('Fetching rising trends...');
        const risingItems = await fetchRisingTrends(10);
        const risingTrends = risingItems.map(trend => ({
            category: 'rising',
            rank: trend.rank,
            title: trend.title,
            summary: trend.reason,
            source_url: trend.link,
            source_name: trend.source,
            change_rate: trend.viralScore,
            metadata: {
                viralScore: trend.viralScore,
                sentimentType: trend.sentimentType,
                isNewToNews: trend.isNewToNews,
            },
        }));
        results.rising = await replaceCategory('rising', risingTrends);

        return NextResponse.json({
            success: true,
            message: 'All trends updated',
            results,
            timestamp: new Date().toISOString(),
        });

    } catch (error: unknown) {
        console.error('Cron fetch-all error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error',
            results,
        }, { status: 500 });
    }
}
