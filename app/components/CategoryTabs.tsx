'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendCategory, CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/trend';

interface CategoryTabsProps {
  activeCategory: TrendCategory;
  onCategoryChange: (category: TrendCategory) => void;
}

export function CategoryTabs({
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  const categories: TrendCategory[] = ['keyword', 'social', 'content', 'shopping', 'rising'];

  return (
    <Tabs
      value={activeCategory}
      onValueChange={(value) => onCategoryChange(value as TrendCategory)}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-5 h-14 bg-transparent gap-1 p-0">
        {categories.map((category) => (
          <TabsTrigger
            key={category}
            value={category}
            className="
              h-full flex flex-col items-center justify-center gap-1 
              bg-white border-2 border-black shadow-hard-sm 
              data-[state=active]:bg-black data-[state=active]:text-white 
              data-[state=active]:translate-x-[2px] data-[state=active]:translate-y-[2px] 
              data-[state=active]:shadow-none 
              transition-all duration-100
              rounded-none
            "
          >
            <span className="text-lg leading-none">{CATEGORY_ICONS[category]}</span>
            <span className="text-[10px] sm:text-xs font-bold uppercase leading-none">
              {CATEGORY_LABELS[category].split(' ')[0]}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
