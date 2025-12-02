import pg from 'pg';

const { Client } = pg;

// SSL 인증서 검증 비활성화 (개발용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DATABASE_URL = "postgres://postgres.qolnmdnmfcxxfuigiser:LCRP5hk0dYVNp3mQ@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

const sql = `
-- 1. 기존 CHECK 제약조건 제거 (있으면)
ALTER TABLE public.trends DROP CONSTRAINT IF EXISTS trends_category_check;

-- 2. 새로운 카테고리 포함 CHECK 제약조건 추가
ALTER TABLE public.trends ADD CONSTRAINT trends_category_check
  CHECK (category IN ('keyword', 'social', 'content', 'shopping', 'rising', 'overall'));

-- 3. rank 제약조건 업데이트 (있으면 제거 후 재생성)
ALTER TABLE public.trends DROP CONSTRAINT IF EXISTS trends_rank_check;
ALTER TABLE public.trends ADD CONSTRAINT trends_rank_check CHECK (rank >= 1 AND rank <= 20);

-- 4. 중복 데이터 제거 (UNIQUE 제약조건 추가 전)
DELETE FROM public.trends a USING public.trends b
WHERE a.id < b.id AND a.category = b.category AND a.rank = b.rank;

-- 5. UNIQUE 인덱스 생성 (UPSERT를 위해 필수!)
DROP INDEX IF EXISTS idx_trends_category_rank_unique;
CREATE UNIQUE INDEX idx_trends_category_rank_unique ON public.trends(category, rank);

-- 6. updated_at 자동 업데이트 트리거
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
`;

async function updateSchema() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    console.log('Updating schema...');
    await client.query(sql);
    console.log('Schema updated successfully!');

    // 인덱스 확인
    const result = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'trends' AND indexname LIKE '%unique%';
    `);
    console.log('Unique indexes:', result.rows);

    // 현재 데이터 개수 확인
    const countResult = await client.query(`
      SELECT category, COUNT(*) as count
      FROM public.trends
      GROUP BY category;
    `);
    console.log('Current data counts:', countResult.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
    console.log('Done!');
  }
}

updateSchema();
