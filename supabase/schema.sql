-- Trending Top5 Database Schema
-- Supabase SQL Editor에서 실행하세요

-- UUID extension (이미 활성화되어 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- trends 테이블 생성
CREATE TABLE IF NOT EXISTS trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('keyword', 'social', 'content', 'shopping', 'rising')),
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 10),
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  source_name TEXT,
  change_rate DECIMAL,
  mention_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_trends_category ON trends(category);
CREATE INDEX IF NOT EXISTS idx_trends_updated ON trends(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_trends_category_rank ON trends(category, rank);
CREATE INDEX IF NOT EXISTS idx_trends_category_updated ON trends(category, updated_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_trends_updated_at ON trends;
CREATE TRIGGER update_trends_updated_at
    BEFORE UPDATE ON trends
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 정책
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 정책 설정
CREATE POLICY "Allow public read access" ON trends
    FOR SELECT
    USING (true);

-- 서비스 역할만 쓰기 가능
CREATE POLICY "Allow service role write access" ON trends
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 샘플 데이터 (테스트용, 선택사항)
-- INSERT INTO trends (category, rank, title, summary, source_name, source_url)
-- VALUES
--   ('keyword', 1, '테스트 키워드', 'AI가 생성한 요약입니다', 'Google Trends', 'https://trends.google.com'),
--   ('news', 1, '테스트 뉴스', 'AI가 생성한 요약입니다', '네이버 뉴스', 'https://news.naver.com'),
--   ('content', 1, '테스트 영상', 'AI가 생성한 요약입니다', 'YouTube', 'https://youtube.com');

-- 확인
SELECT 'trends 테이블이 성공적으로 생성되었습니다!' as message;
