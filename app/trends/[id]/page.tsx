import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { Trend } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { ExternalLink, ArrowLeft, Brain, MessageCircle, Share2 } from 'lucide-react';
import Link from 'next/link';
import { ShareButton } from '@/app/components/ShareButton';

export const revalidate = 60;

interface Props {
    params: { id: string };
}

async function getTrend(id: string) {
    const { data, error } = await supabase
        .from('trends')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) return null;
    return data as Trend;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const trend = await getTrend(params.id);
    if (!trend) return { title: 'Trend Not Found' };
    return {
        title: `${trend.title} - Trending Top 5`,
        description: trend.summary,
    };
}

export default async function TrendPage({ params }: Props) {
    const trend = await getTrend(params.id);

    if (!trend) {
        notFound();
    }

    const metadata = trend.metadata as Record<string, any>;

    return (
        <div className="min-h-screen bg-[var(--color-nb-yellow)] font-sans p-4 pb-20">
            <div className="max-w-2xl mx-auto">
                {/* 네비게이션 */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 font-bold bg-white border-2 border-black shadow-hard px-4 py-2 mb-6 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard-lg transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    BACK TO LIST
                </Link>

                {/* 메인 카드 */}
                <div id="trend-content" className="bg-white border-thick border-black shadow-hard p-6 mb-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <h1 className="text-3xl sm:text-4xl font-black uppercase leading-tight">
                            {trend.title}
                        </h1>
                        <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-black text-white text-2xl font-black border-2 border-black shadow-hard-sm">
                            #{trend.rank}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                        <span className="bg-[var(--color-nb-blue)] text-white px-3 py-1 font-bold border-2 border-black text-sm uppercase">
                            {trend.category}
                        </span>
                        <span className="bg-gray-100 px-3 py-1 font-bold border-2 border-black text-sm flex items-center gap-1">
                            {trend.source_name}
                        </span>
                    </div>

                    {/* 썸네일 */}
                    {metadata.thumbnail && (
                        <div className="mb-6 border-2 border-black shadow-hard overflow-hidden">
                            <img
                                src={metadata.thumbnail}
                                alt={trend.title}
                                className="w-full h-auto object-cover"
                            />
                        </div>
                    )}

                    {/* AI 분석 */}
                    <div className="bg-[var(--color-nb-purple)]/10 border-2 border-black p-5 mb-6 relative">
                        <div className="absolute -top-3 -left-3 bg-[var(--color-nb-purple)] text-white px-3 py-1 font-bold border-2 border-black shadow-hard-sm flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            WHY IT'S TRENDING
                        </div>
                        <p className="mt-2 text-lg font-medium leading-relaxed">
                            {trend.summary}
                        </p>
                    </div>

                    {/* 상세 정보 (메타데이터 기반) */}
                    {metadata.description && (
                        <div className="mb-6">
                            <h3 className="font-black text-xl mb-2 flex items-center gap-2">
                                <MessageCircle className="w-5 h-5" />
                                CONTEXT
                            </h3>
                            <p className="text-gray-700 leading-relaxed border-l-4 border-gray-300 pl-4">
                                {metadata.description}
                            </p>
                        </div>
                    )}

                    {/* 액션 버튼 */}
                    <div className="flex gap-3 mt-8">
                        <a
                            href={trend.source_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-black text-white font-bold py-4 flex items-center justify-center gap-2 border-2 border-black shadow-hard hover:bg-gray-900 transition-colors"
                        >
                            <ExternalLink className="w-5 h-5" />
                            VIEW SOURCE
                        </a>
                        <ShareButton targetId="trend-content" title={trend.title} />
                    </div>
                </div>
            </div>
        </div>
    );
}
