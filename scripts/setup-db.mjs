import pg from 'pg';

const { Client } = pg;

// SSL 인증서 검증 비활성화 (개발용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DATABASE_URL = "postgres://postgres.qolnmdnmfcxxfuigiser:LCRP5hk0dYVNp3mQ@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

const sql = `
-- UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing table if needed (comment out if you want to keep data)
-- DROP TABLE IF EXISTS trends;

-- trends 테이블 생성
CREATE TABLE IF NOT EXISTS trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('keyword', 'news', 'content')),
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

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 (존재하면 삭제 후 재생성)
DROP TRIGGER IF EXISTS update_trends_updated_at ON trends;
CREATE TRIGGER update_trends_updated_at
    BEFORE UPDATE ON trends
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (에러 방지)
DROP POLICY IF EXISTS "Allow public read access" ON trends;
DROP POLICY IF EXISTS "Allow service role write access" ON trends;

-- 새 정책 생성
CREATE POLICY "Allow public read access" ON trends
    FOR SELECT
    USING (true);

CREATE POLICY "Allow service role write access" ON trends
    FOR ALL
    USING (true)
    WITH CHECK (true);
`;

async function setup() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    console.log('Creating tables...');
    await client.query(sql);
    console.log('Tables created successfully!');

    // 테이블 확인
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'trends'
    `);
    console.log('Verified table exists:', result.rows.length > 0);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
    console.log('Done!');
  }
}

setup();
