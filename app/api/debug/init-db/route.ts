import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const createTableSQL = `
        -- 1. 테이블 생성 (없을 때만)
        CREATE TABLE IF NOT EXISTS public.trends (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            category text NOT NULL CHECK (category IN ('keyword', 'social', 'content', 'shopping', 'rising', 'overall')),
            rank integer NOT NULL CHECK (rank >= 1 AND rank <= 20),
            title text NOT NULL,
            summary text,
            source_url text,
            source_name text,
            change_rate numeric,
            metadata jsonb DEFAULT '{}'::jsonb,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now(),
            UNIQUE(category, rank)  -- UPSERT를 위한 고유 제약조건
        );

        -- 2. 인덱스 생성
        CREATE INDEX IF NOT EXISTS idx_trends_category ON public.trends(category);
        CREATE INDEX IF NOT EXISTS idx_trends_rank ON public.trends(rank);
        CREATE INDEX IF NOT EXISTS idx_trends_category_rank ON public.trends(category, rank);

        -- 3. updated_at 자동 업데이트 함수
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        -- 4. 트리거 설정
        DROP TRIGGER IF EXISTS update_trends_updated_at ON public.trends;
        CREATE TRIGGER update_trends_updated_at
            BEFORE UPDATE ON public.trends
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        -- 5. RLS 설정
        ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow public read access" ON public.trends;
        CREATE POLICY "Allow public read access" ON public.trends
            FOR SELECT USING (true);

        DROP POLICY IF EXISTS "Allow service role full access" ON public.trends;
        CREATE POLICY "Allow service role full access" ON public.trends
            FOR ALL USING (true) WITH CHECK (true);
    `;

    try {
        const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });

        if (error) {
            // Try direct SQL if rpc doesn't work
            const { data, error: directError } = await supabase
                .from('trends')
                .select('count', { count: 'exact', head: true });

            if (directError && directError.code === 'PGRST204') {
                return NextResponse.json({
                    success: false,
                    message: 'Table does not exist. Please create it manually in Supabase SQL Editor.',
                    sql: createTableSQL
                });
            }

            return NextResponse.json({
                success: false,
                error: error.message,
                hint: 'Try creating the table manually in Supabase SQL Editor',
                sql: createTableSQL
            });
        }

        return NextResponse.json({ success: true, message: 'Table created successfully' });
    } catch (err: any) {
        return NextResponse.json({
            success: false,
            error: err.message,
            sql: createTableSQL
        });
    }
}
