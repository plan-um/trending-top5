import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 클라이언트용 (읽기 전용)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 서버용 (읽기/쓰기)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;

// 타입 정의
import { TrendCategory } from '@/types/trend';

export type { TrendCategory };

export interface Trend {
  id: string;
  category: TrendCategory;
  rank: number;
  title: string;
  summary: string | null;
  source_url: string | null;
  source_name: string | null;
  change_rate: number | null;
  mention_count: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TrendItem {
  id: string;
  rank: number;
  title: string;
  summary: string | null;
  sourceUrl: string | null;
  sourceName: string;
  changeRate: number | null;
  thumbnail?: string;
  metadata: Record<string, any>;
  updatedAt: string;
}

// 트렌드 조회
export async function getTrendsByCategory(category: TrendCategory): Promise<Trend[]> {
  const { data, error } = await supabase
    .from('trends')
    .select('*')
    .eq('category', category)
    .order('rank', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error fetching trends:', error);
    return [];
  }

  return data || [];
}

// 모든 카테고리 트렌드 조회
export async function getAllTrends(): Promise<Record<TrendCategory, TrendItem[]>> {
  const categories: TrendCategory[] = ['keyword', 'social', 'content', 'shopping', 'rising'];
  const results: Record<string, TrendItem[]> = {};

  for (const cat of categories) {
    const { data, error } = await supabase
      .from('trends')
      .select('*')
      .eq('category', cat)
      .order('rank', { ascending: true })
      .limit(10);

    if (error) {
      console.error(`Error fetching ${cat} trends:`, error);
      results[cat] = [];
      continue;
    }

    results[cat] = (data || []).map((trend: Trend) => ({
      id: trend.id,
      rank: trend.rank,
      title: trend.title,
      summary: trend.summary,
      sourceUrl: trend.source_url,
      sourceName: trend.source_name || '',
      changeRate: trend.change_rate,
      thumbnail: (trend.metadata as Record<string, string>)?.thumbnail,
      metadata: (trend.metadata as Record<string, any>) || {},
      updatedAt: trend.updated_at,
    }));
  }

  return results as Record<TrendCategory, TrendItem[]>;
}

// 트렌드 저장 (서버 전용) - UPSERT 사용
export async function saveTrends(
  category: TrendCategory,
  trends: Omit<Trend, 'id' | 'created_at' | 'updated_at'>[]
): Promise<boolean> {
  // UPSERT: 테이블 유지하면서 데이터만 업데이트
  const { error } = await supabaseAdmin
    .from('trends')
    .upsert(trends, { onConflict: 'category,rank' });

  if (error) {
    console.error('Error upserting trends:', error);
    return false;
  }

  return true;
}

// 마지막 업데이트 시간 조회
export async function getLastUpdateTime(category: TrendCategory): Promise<string | null> {
  const { data, error } = await supabase
    .from('trends')
    .select('updated_at')
    .eq('category', category)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data.updated_at;
}
