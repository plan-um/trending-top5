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

            // UPSERT: 테이블 유지하면서 데이터만 업데이트
            const { error: upsertError } = await supabaseAdmin
                .from('trends')
                .upsert(trendsWithSummary, {
                    onConflict: 'category,rank',
                    ignoreDuplicates: false
                });

            if (upsertError) {
                console.error('Error upserting keyword trends:', upsertError);
                throw upsertError;
            }
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

            // UPSERT: 테이블 유지하면서 데이터만 업데이트
            const { error: upsertError } = await supabaseAdmin
                .from('trends')
                .upsert(trendsWithSummary, {
                    onConflict: 'category,rank',
                    ignoreDuplicates: false
                });

            if (upsertError) {
                console.error('Error upserting social trends:', upsertError);
                throw upsertError;
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

            // UPSERT: 테이블 유지하면서 데이터만 업데이트
            const { error: upsertError } = await supabaseAdmin
                .from('trends')
                .upsert(trendsWithSummary, {
                    onConflict: 'category,rank',
                    ignoreDuplicates: false
                });

            if (upsertError) {
                console.error('Error upserting content trends:', upsertError);
                throw upsertError;
            }
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

            // UPSERT: 테이블 유지하면서 데이터만 업데이트
            const { error: upsertError } = await supabaseAdmin
                .from('trends')
                .upsert(trendsToSave, {
                    onConflict: 'category,rank',
                    ignoreDuplicates: false
                });

            if (upsertError) {
                console.error('Error upserting shopping trends:', upsertError);
                throw upsertError;
            }
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

            // UPSERT: 테이블 유지하면서 데이터만 업데이트
            const { error: upsertError } = await supabaseAdmin
                .from('trends')
                .upsert(trendsToSave, {
                    onConflict: 'category,rank',
                    ignoreDuplicates: false
                });

            if (upsertError) {
                console.error('Error upserting rising trends:', upsertError);
                throw upsertError;
            }
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
