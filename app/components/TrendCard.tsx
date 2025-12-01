import { TrendItem, TrendCategory } from '@/types/trend';
import { ExternalLink, TrendingUp, Youtube, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendCardProps {
  item: TrendItem;
  category: TrendCategory;
  showThumbnail?: boolean;
}

// 감정 타입별 색상/이모지
const SENTIMENT_STYLES: Record<string, { emoji: string; color: string }> = {
  '논란': { emoji: '🔥', color: 'bg-red-500' },
  '충격': { emoji: '😱', color: 'bg-purple-500' },
  '감동': { emoji: '🥹', color: 'bg-blue-500' },
  '흥미': { emoji: '👀', color: 'bg-green-500' },
  '분노': { emoji: '😤', color: 'bg-orange-500' },
  '웃김': { emoji: '😂', color: 'bg-yellow-500' },
};

export function TrendCard({ item, category, showThumbnail = false }: TrendCardProps) {
  const getSourceIcon = (sourceName: string) => {
    if (sourceName.includes('YouTube')) return <Youtube className="w-3 h-3" />;
    if (sourceName.includes('Google')) return <Search className="w-3 h-3" />;
    return <ExternalLink className="w-3 h-3" />;
  };

  // 떡상중(Rising) 카테고리 정보
  const isRising = category === 'rising';
  const viralScore = item.metadata?.viralScore;
  const sentimentType = item.metadata?.sentimentType;
  const isNewToNews = item.metadata?.isNewToNews;
  const sentimentStyle = sentimentType ? SENTIMENT_STYLES[sentimentType] : null;

  return (
    <div className="group relative">
      <div className={cn(
        "bg-white border-2 border-black shadow-hard p-4 transition-transform hover:-translate-y-1 hover:shadow-hard-lg",
        category === 'shopping' && "border-l-8 border-l-[var(--color-nb-purple)]",
        isRising && "border-l-8 border-l-[var(--color-nb-red)] bg-gradient-to-r from-red-50 to-white"
      )}>
        <div className="flex gap-4">
          {/* 랭크 배지 - Rising일 때는 바이럴 점수 표시 */}
          <div className={cn(
            "flex-shrink-0 w-12 h-12 flex flex-col items-center justify-center border-2 border-black text-xl font-black shadow-hard-sm",
            isRising ? "bg-gradient-to-br from-red-500 to-orange-500 text-white" :
              item.rank === 1 ? "bg-[var(--color-nb-red)] text-white" :
                item.rank === 2 ? "bg-[var(--color-nb-blue)] text-white" :
                  item.rank === 3 ? "bg-[var(--color-nb-green)] text-black" :
                    "bg-white text-black"
          )}>
            {isRising ? (
              <>
                <span className="text-xs">🔮</span>
                <span className="text-sm">{viralScore}</span>
              </>
            ) : item.rank}
          </div>

          <div className="flex-1 min-w-0">
            {/* 제목 및 링크 */}
            <a
              href={item.sourceUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="block group-hover:underline decoration-2 underline-offset-2"
            >
              <h3 className="text-lg font-black truncate leading-tight mb-1">
                {item.title}
              </h3>
            </a>

            {/* 메타 정보 */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500 mb-3">
              <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 border border-black">
                {getSourceIcon(item.sourceName)}
                {item.sourceName}
              </span>
              {/* Rising: 감정 타입 배지 */}
              {isRising && sentimentStyle && (
                <span className={cn(
                  "flex items-center gap-1 px-2 py-0.5 border border-black text-white",
                  sentimentStyle.color
                )}>
                  {sentimentStyle.emoji} {sentimentType}
                </span>
              )}
              {/* Rising: 뉴스 미노출 배지 */}
              {isRising && isNewToNews && (
                <span className="flex items-center gap-1 bg-black text-[var(--color-nb-yellow)] px-2 py-0.5 border border-black">
                  <Sparkles className="w-3 h-3" />
                  뉴스 미노출
                </span>
              )}
              {/* 기존: changeRate 표시 (Rising 아닐 때) */}
              {!isRising && item.changeRate && (
                <span className="flex items-center text-[var(--color-nb-red)]">
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  {item.changeRate}%
                </span>
              )}
            </div>

            {/* 썸네일 (콘텐츠 카테고리 등) */}
            {showThumbnail && item.thumbnail && (
              <div className="mb-3 border-2 border-black shadow-hard-sm overflow-hidden aspect-video">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* AI 요약 */}
            {item.summary && (
              <div className="bg-[var(--color-nb-yellow)]/20 border-l-4 border-[var(--color-nb-yellow)] p-3 text-sm font-medium">
                <p className="line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
