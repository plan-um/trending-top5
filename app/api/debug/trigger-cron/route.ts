import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchTrendingKeywords } from '@/lib/google-trends';
import { fetchSocialTrends } from '@/lib/social-trends';
import { fetchTrendingVideos } from '@/lib/youtube';
import { fetchShoppingTrends } from '@/lib/shopping-trends';
import { fetchRisingTrends } from '@/lib/community-trends';
import { generateSummary } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
        return NextResponse.json({ error: 'Missing type parameter (keyword, social, content, shopping, rising)' }, { status: 400 });
    }

    try {
        let results;

        if (type === 'keyword') {
            console.log('Fetching keyword trends...');
            const keywords = await fetchTrendingKeywords(10);

            const trendsWithSummary = await Promise.all(
                keywords.map(async (keyword) => {
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

            await supabaseAdmin.from('trends').delete().eq('category', 'keyword');
            await supabaseAdmin.from('trends').insert(trendsWithSummary);
            results = trendsWithSummary;

        } else if (type === 'social') {
            console.log('Fetching social trends...');
            const socialItems = await fetchSocialTrends(10);

            const trendsWithSummary = await Promise.all(
                socialItems.map(async (item) => {
                    const summary = await generateSummary(item.title, item.description || item.title);
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

            const { error: deleteError } = await supabaseAdmin.from('trends').delete().eq('category', 'social');
            if (deleteError) console.error('Error deleting social trends:', deleteError);

            const { error: insertError } = await supabaseAdmin.from('trends').insert(trendsWithSummary);
            if (insertError) {
                console.error('Error saving social trends:', insertError);
                throw insertError;
            }
            results = trendsWithSummary;

        } else if (type === 'content') {
            console.log('Fetching YouTube trending videos...');
            const videos = await fetchTrendingVideos(10);

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

            await supabaseAdmin.from('trends').delete().eq('category', 'content');
            await supabaseAdmin.from('trends').insert(trendsWithSummary);
            results = trendsWithSummary;

        } else if (type === 'shopping') {
            console.log('Fetching shopping trends...');
            const shoppingItems = await fetchShoppingTrends(10);

            const trendsToSave = shoppingItems.map(item => ({
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

            await supabaseAdmin.from('trends').delete().eq('category', 'shopping');
            await supabaseAdmin.from('trends').insert(trendsToSave);
            results = trendsToSave;

        } else if (type === 'rising') {
            console.log('Fetching rising trends...');
            const risingTrends = await fetchRisingTrends(10);

            const trendsToSave = risingTrends.map(trend => ({
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

            await supabaseAdmin.from('trends').delete().eq('category', 'rising');
            await supabaseAdmin.from('trends').insert(trendsToSave);
            results = trendsToSave;

        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        return NextResponse.json({ success: true, count: results.length, items: results });

    } catch (error: any) {
        console.error('Debug error:', error);
        return NextResponse.json({
            error: error.message || 'Unknown error',
            details: error
        }, { status: 500 });
    }
}
