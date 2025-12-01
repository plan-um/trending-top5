'use client';

import { TrendCard } from './TrendCard';
import { TrendItem, TrendCategory } from '@/types/trend';
import { Skeleton } from '@/components/ui/skeleton';

interface TrendListProps {
  items: TrendItem[];
  category: TrendCategory;
  isLoading: boolean;
}

export function TrendList({ items, category, isLoading }: TrendListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 border-thick border-black shadow-hard animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-white border-thick border-black shadow-hard">
        <p className="text-gray-500 font-bold">데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {items.map((item) => (
        <TrendCard
          key={item.id}
          item={item}
          category={category}
          showThumbnail={category === 'content'}
        />
      ))}
    </div>
  );
}
