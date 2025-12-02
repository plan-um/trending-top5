-- Supabase SQL Editor에서 실행하세요
-- 기존 테이블의 스키마를 UPSERT 지원하도록 업데이트

-- 1. 기존 CHECK 제약조건 제거 (있으면)
ALTER TABLE public.trends DROP CONSTRAINT IF EXISTS trends_category_check;

-- 2. 새로운 카테고리 포함 CHECK 제약조건 추가
ALTER TABLE public.trends ADD CONSTRAINT trends_category_check
  CHECK (category IN ('keyword', 'social', 'content', 'shopping', 'rising', 'overall'));

-- 3. rank 제약조건 업데이트 (있으면 제거 후 재생성)
ALTER TABLE public.trends DROP CONSTRAINT IF EXISTS trends_rank_check;
ALTER TABLE public.trends ADD CONSTRAINT trends_rank_check CHECK (rank >= 1 AND rank <= 20);

-- 4. UNIQUE 제약조건 추가 (UPSERT를 위해 필수!)
-- 먼저 중복 데이터 확인 및 제거
DELETE FROM public.trends a USING public.trends b
WHERE a.id < b.id AND a.category = b.category AND a.rank = b.rank;

-- UNIQUE 인덱스 생성
DROP INDEX IF EXISTS idx_trends_category_rank_unique;
CREATE UNIQUE INDEX idx_trends_category_rank_unique ON public.trends(category, rank);

-- 또는 CONSTRAINT로 추가
-- ALTER TABLE public.trends ADD CONSTRAINT trends_category_rank_unique UNIQUE(category, rank);

-- 5. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_trends_updated_at ON public.trends;
CREATE TRIGGER update_trends_updated_at
    BEFORE UPDATE ON public.trends
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. 확인
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'trends';
