export type TrendCategory = 'keyword' | 'social' | 'content' | 'shopping' | 'rising';

export interface TrendItem {
  id?: string;
  rank: number;
  title: string;
  summary: string | null;
  sourceUrl: string | null;
  sourceName: string;
  changeRate?: number | null;
  thumbnail?: string;
  price?: string;
  metadata?: Record<string, any>;
  updatedAt: string;
}

export interface TrendResponse {
  category: TrendCategory;
  categoryLabel: string;
  updatedAt: string | null;
  items: TrendItem[];
}

export interface AllTrendsResponse {
  trends: Record<TrendCategory, TrendResponse>;
  lastUpdated: string;
}

export const CATEGORY_LABELS: Record<TrendCategory, string> = {
  keyword: '뉴스',
  social: '소셜',
  content: '유튜브',
  shopping: '쇼핑',
  rising: '떡상중',
};

export const CATEGORY_ICONS: Record<TrendCategory, string> = {
  keyword: '📰',
  social: '💬',
  content: '📺',
  shopping: '🛒',
  rising: '🚀',
};
