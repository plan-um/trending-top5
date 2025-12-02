import pg from 'pg';

const { Client } = pg;

// SSL 인증서 검증 비활성화 (개발용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DATABASE_URL = "postgres://postgres.qolnmdnmfcxxfuigiser:LCRP5hk0dYVNp3mQ@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

const sql = `
-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- trends 테이블 생성 (올바른 스키마!)
CREATE TABLE IF NOT EXISTS public.trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('keyword', 'social', 'content', 'shopping', 'rising', 'overall')),
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 20),
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  source_name TEXT,
  change_rate DECIMAL,
  mention_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, rank)  -- UPSERT를 위한 고유 제약조건!
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_trends_category ON public.trends(category);
CREATE INDEX IF NOT EXISTS idx_trends_updated ON public.trends(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_trends_category_rank ON public.trends(category, rank);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 (존재하면 삭제 후 재생성)
DROP TRIGGER IF EXISTS update_trends_updated_at ON public.trends;
CREATE TRIGGER update_trends_updated_at
    BEFORE UPDATE ON public.trends
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (에러 방지)
DROP POLICY IF EXISTS "Allow public read access" ON public.trends;
DROP POLICY IF EXISTS "Allow service role write access" ON public.trends;

-- 새 정책 생성
CREATE POLICY "Allow public read access" ON public.trends
    FOR SELECT
    USING (true);

CREATE POLICY "Allow service role write access" ON public.trends
    FOR ALL
    USING (true)
    WITH CHECK (true);
`;

async function createTable() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    console.log('Creating table with correct schema...');
    await client.query(sql);
    console.log('Table created successfully!');

    // 테이블 확인
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'trends'
    `);
    console.log('Table exists:', result.rows.length > 0);

    // 제약조건 확인
    const constraints = await client.query(`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'public.trends'::regclass;
    `);
    console.log('Constraints:', constraints.rows);

    // 인덱스 확인
    const indexes = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'trends';
    `);
    console.log('Indexes:', indexes.rows.map(r => r.indexname));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
    console.log('Done!');
  }
}

createTable();
