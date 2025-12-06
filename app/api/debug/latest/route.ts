import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Check service role key availability
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Get latest records for each category
    const categories = ['keyword', 'social', 'content', 'shopping', 'rising'];
    const results: Record<string, unknown> = {
        hasServiceKey,
        categories: {},
    };

    for (const cat of categories) {
        const { data, error } = await supabaseAdmin
            .from('trends')
            .select('id, title, updated_at, created_at')
            .eq('category', cat)
            .order('rank', { ascending: true })
            .limit(1);

        if (error) {
            (results.categories as Record<string, unknown>)[cat] = { error: error.message };
        } else if (data && data.length > 0) {
            (results.categories as Record<string, unknown>)[cat] = {
                title: data[0].title,
                updated_at: data[0].updated_at,
                created_at: data[0].created_at,
            };
        } else {
            (results.categories as Record<string, unknown>)[cat] = { data: 'No data' };
        }
    }

    return NextResponse.json(results);
}
