'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { TrendCategory, TrendResponse, TrendItem, CATEGORY_ICONS } from '@/types/trend';
import { Flame, ExternalLink, Youtube, Search, TrendingUp, ShoppingCart, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES: TrendCategory[] = ['keyword', 'social', 'content', 'shopping', 'rising'];

const US_CATEGORY_LABELS: Record<TrendCategory, string> = {
  keyword: 'News',
  social: 'Social',
  content: 'YouTube',
  shopping: 'Shopping',
  rising: 'Trending',
};

export default function USPage() {
  const [trends, setTrends] = useState<Record<TrendCategory, TrendResponse | null>>({
    keyword: null,
    social: null,
    content: null,
    shopping: null,
    rising: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<TrendCategory>('keyword');
  const [basePath, setBasePath] = useState('');
  const sectionRefs = useRef<Record<TrendCategory, HTMLElement | null>>({
    keyword: null,
    social: null,
    content: null,
    shopping: null,
    rising: null,
  });

  const fetchTrends = useCallback(async (forceRefresh = false) => {
    try {
      // Detect basePath from current URL (e.g., /top10 for planum.one/top10)
      const basePath = typeof window !== 'undefined'
        ? window.location.pathname.replace(/\/us$/, '').replace(/\/$/, '')
        : '';
      const apiPath = `${basePath}/api/trends/us${forceRefresh ? '?refresh=true' : ''}`;
      const response = await fetch(apiPath);
      if (!response.ok) throw new Error('Failed to fetch trends');
      const data = await response.json();
      setTrends(data.trends);
    } catch (error) {
      console.error('Error fetching US trends:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Detect basePath from current URL (e.g., /top10 for planum.one/top10)
    const detectedBasePath = window.location.pathname.replace(/\/us$/, '').replace(/\/$/, '');
    setBasePath(detectedBasePath);

    fetchTrends();
    const interval = setInterval(() => fetchTrends(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTrends]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (const category of CATEGORIES) {
        const section = sectionRefs.current[category];
        if (section) {
          const { offsetTop, offsetHeight } = section;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(category);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTrends(true);
  };

  const scrollToSection = (category: TrendCategory) => {
    const section = sectionRefs.current[category];
    if (section) {
      const headerOffset = 140;
      const elementPosition = section.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const getTopItems = () => {
    return CATEGORIES.map(cat => ({
      category: cat,
      item: trends[cat]?.items?.[0] || null,
    })).filter(x => x.item !== null);
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[var(--color-nb-yellow)] font-sans selection:bg-black selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b-thick border-black shadow-hard">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-black p-2 shadow-hard-sm">
                <Flame className="w-5 h-5 text-[var(--color-nb-yellow)] fill-current" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase">
                Trending Top 10
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Country Toggle */}
              <div className="flex items-center border-2 border-black bg-white">
                <Link
                  href={basePath || '/'}
                  className="px-2 py-1 text-lg font-bold bg-white text-black hover:bg-gray-100 transition-all"
                  title="한국"
                >
                  🇰🇷
                </Link>
                <span className="px-2 py-1 text-lg font-bold bg-black text-white">
                  🇺🇸
                </span>
              </div>
              {/* Update Time */}
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
                <span className="text-gray-500">
                  {formatTime(trends.keyword?.updatedAt || null)}
                </span>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={cn(
                    "p-1 border border-black bg-white hover:bg-gray-100 transition-all",
                    isRefreshing && "animate-spin"
                  )}
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
              <span className="hidden md:block px-2 py-1 bg-black text-white text-xs font-bold uppercase tracking-wider transform -rotate-1">
                Live
              </span>
            </div>
          </div>

          {/* Mobile Quick Nav */}
          <nav className="lg:hidden flex gap-1 overflow-x-auto pt-3 -mx-4 px-4 scrollbar-hide">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => scrollToSection(category)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1 px-3 py-2 border-2 border-black font-bold text-sm transition-all",
                  activeSection === category
                    ? "bg-black text-white shadow-none translate-x-[2px] translate-y-[2px]"
                    : "bg-white shadow-hard-sm hover:bg-gray-100"
                )}
              >
                <span>{CATEGORY_ICONS[category]}</span>
                <span>{US_CATEGORY_LABELS[category]}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 py-6">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Hero Section */}
            <HeroSection topItems={getTopItems()} />

            {/* PC: 5 Columns */}
            <div className="hidden lg:grid lg:grid-cols-5 gap-4 mt-8">
              {CATEGORIES.map((category) => (
                <CategoryColumn
                  key={category}
                  category={category}
                  items={trends[category]?.items || []}
                  categoryLabel={US_CATEGORY_LABELS[category]}
                />
              ))}
            </div>

            {/* Mobile: Vertical Sections */}
            <div className="lg:hidden space-y-8 mt-6">
              {CATEGORIES.map((category) => (
                <MobileSection
                  key={category}
                  category={category}
                  items={trends[category]?.items || []}
                  sectionRef={(el) => { sectionRefs.current[category] = el; }}
                  categoryLabel={US_CATEGORY_LABELS[category]}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-black bg-white mt-8">
        <div className="max-w-[1800px] mx-auto px-4 py-6 text-center">
          <p className="font-bold text-sm">
            Auto-updated hourly | <span className="bg-[var(--color-nb-purple)] px-1">Real-time Trends</span>
          </p>
          <p className="text-xs text-gray-500 mt-2 font-mono">
            © 2025 TRENDING TOP 10
          </p>
        </div>
      </footer>
    </div>
  );
}

// Hero Section
function HeroSection({ topItems }: { topItems: { category: TrendCategory; item: TrendItem | null }[] }) {
  if (topItems.length === 0) return null;

  return (
    <div className="bg-white border-2 border-black shadow-hard p-4">
      <h2 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
        <span className="bg-black text-white px-2 py-1">HOT NOW</span>
        <span className="text-sm font-normal text-gray-500">#1 in each category</span>
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {topItems.map(({ category, item }) => item && (
          <a
            key={category}
            href={item.sourceUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-gray-50 border-2 border-black p-3 hover:bg-gray-100 transition-colors"
          >
            <div className={cn(
              "text-xs font-bold uppercase mb-2 px-2 py-0.5 inline-block border border-black",
              category === 'keyword' && "bg-[var(--color-nb-blue)]",
              category === 'social' && "bg-[var(--color-nb-green)]",
              category === 'content' && "bg-[var(--color-nb-orange)]",
              category === 'shopping' && "bg-[var(--color-nb-purple)]",
              category === 'rising' && "bg-[var(--color-nb-red)] text-white"
            )}>
              {CATEGORY_ICONS[category]} {US_CATEGORY_LABELS[category]}
            </div>

            {(item.thumbnail || item.metadata?.thumbnail) && (
              <div className="mb-2 border border-black overflow-hidden aspect-video">
                <img
                  src={item.thumbnail || item.metadata?.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
            )}

            <h3 className="text-sm font-bold line-clamp-2 group-hover:underline">
              {item.title}
            </h3>

            {item.summary && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {item.summary}
              </p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

// PC Column
function CategoryColumn({ category, items, categoryLabel }: { category: TrendCategory; items: TrendItem[]; categoryLabel: string }) {
  const getCategoryColor = (cat: TrendCategory) => {
    switch (cat) {
      case 'keyword': return 'bg-[var(--color-nb-blue)]';
      case 'social': return 'bg-[var(--color-nb-green)]';
      case 'content': return 'bg-[var(--color-nb-orange)]';
      case 'shopping': return 'bg-[var(--color-nb-purple)]';
      case 'rising': return 'bg-[var(--color-nb-red)] text-white';
      default: return 'bg-gray-200';
    }
  };

  return (
    <div className="flex flex-col">
      <div className={cn("border-2 border-black p-3 mb-3 shadow-hard-sm", getCategoryColor(category))}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{CATEGORY_ICONS[category]}</span>
          <h2 className="text-sm font-black uppercase">{categoryLabel}</h2>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {items.length > 0 ? (
          items.map((item, idx) => (
            <TrendItemCard
              key={item.id || idx}
              item={item}
              category={category}
              showImage={idx < 3}
            />
          ))
        ) : (
          <div className="text-center py-8 bg-white border-2 border-black">
            <p className="text-gray-400 text-sm">No data</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Mobile Section
function MobileSection({
  category,
  items,
  sectionRef,
  categoryLabel,
}: {
  category: TrendCategory;
  items: TrendItem[];
  sectionRef: (el: HTMLElement | null) => void;
  categoryLabel: string;
}) {
  const getCategoryColor = (cat: TrendCategory) => {
    switch (cat) {
      case 'keyword': return 'bg-[var(--color-nb-blue)]';
      case 'social': return 'bg-[var(--color-nb-green)]';
      case 'content': return 'bg-[var(--color-nb-orange)]';
      case 'shopping': return 'bg-[var(--color-nb-purple)]';
      case 'rising': return 'bg-[var(--color-nb-red)] text-white';
      default: return 'bg-gray-200';
    }
  };

  return (
    <section
      ref={sectionRef}
      id={`section-${category}`}
      className="scroll-mt-32"
    >
      <div className={cn("border-2 border-black p-3 mb-3 shadow-hard", getCategoryColor(category))}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{CATEGORY_ICONS[category]}</span>
          <h2 className="text-lg font-black uppercase">{categoryLabel}</h2>
        </div>
      </div>

      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item, idx) => (
            <TrendItemCard
              key={item.id || idx}
              item={item}
              category={category}
              showImage={idx < 3}
            />
          ))
        ) : (
          <div className="text-center py-8 bg-white border-2 border-black shadow-hard">
            <p className="text-gray-400 font-bold">No data available.</p>
          </div>
        )}
      </div>
    </section>
  );
}

// Trend Item Card
function TrendItemCard({
  item,
  category,
  showImage,
}: {
  item: TrendItem;
  category: TrendCategory;
  showImage: boolean;
}) {
  const isRising = category === 'rising';
  const isShopping = category === 'shopping';
  const thumbnail = item.thumbnail || item.metadata?.thumbnail;

  const getSourceIcon = (sourceName: string) => {
    if (sourceName.includes('YouTube')) return <Youtube className="w-3 h-3" />;
    if (sourceName.includes('Google')) return <Search className="w-3 h-3" />;
    if (isShopping) return <ShoppingCart className="w-3 h-3" />;
    return <ExternalLink className="w-3 h-3" />;
  };

  return (
    <a
      href={item.sourceUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block bg-white border-2 border-black p-3 transition-all hover:-translate-y-0.5 hover:shadow-hard",
        isRising && "border-l-4 border-l-[var(--color-nb-red)] bg-gradient-to-r from-red-50 to-white",
        isShopping && "border-l-4 border-l-[var(--color-nb-purple)]"
      )}
    >
      <div className="flex gap-3">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 flex items-center justify-center border-2 border-black text-sm font-black",
          item.rank === 1 ? "bg-[var(--color-nb-red)] text-white" :
            item.rank === 2 ? "bg-[var(--color-nb-blue)] text-white" :
              item.rank === 3 ? "bg-[var(--color-nb-green)] text-black" :
                "bg-gray-100 text-black"
        )}>
          {item.rank}
        </div>

        <div className="flex-1 min-w-0">
          {showImage && thumbnail && (
            <div className="mb-2 border border-black overflow-hidden aspect-video max-h-24">
              <img
                src={thumbnail}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <h3 className="text-sm font-bold line-clamp-2 leading-tight mb-1 hover:underline">
            {item.title}
          </h3>

          {isShopping && (item.price || item.metadata?.price) && (
            <p className="text-sm font-bold text-[var(--color-nb-red)] mb-1">
              {item.price || item.metadata?.price}
            </p>
          )}

          {item.summary && (
            <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed mb-1">
              {item.summary}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1 text-[10px] text-gray-500">
            <span className="flex items-center gap-0.5">
              {getSourceIcon(item.sourceName)}
              {item.sourceName}
            </span>
            {!isRising && item.changeRate && (
              <span className="flex items-center text-[var(--color-nb-red)]">
                <TrendingUp className="w-2.5 h-2.5" />
                {item.changeRate}%
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-black p-4">
        <div className="h-6 bg-gray-200 animate-pulse w-32 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-100 border border-gray-200 p-3">
              <div className="h-4 bg-gray-200 animate-pulse w-16 mb-2" />
              <div className="aspect-video bg-gray-200 animate-pulse mb-2" />
              <div className="h-4 bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {CATEGORIES.map((category) => (
          <div key={category} className="bg-white border-2 border-black p-4">
            <div className="h-6 bg-gray-200 animate-pulse mb-4 w-24" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse border border-gray-200" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
