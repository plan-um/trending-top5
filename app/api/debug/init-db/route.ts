import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.trends (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            category text NOT NULL,
            rank integer NOT NULL,
            title text NOT NULL,
            summary text,
            source_url text,
            source_name text,
            change_rate numeric,
            metadata jsonb DEFAULT '{}'::jsonb,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_trends_category ON public.trends(category);
        CREATE INDEX IF NOT EXISTS idx_trends_rank ON public.trends(rank);

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
