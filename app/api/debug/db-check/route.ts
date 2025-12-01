import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    const categories = ['keyword', 'social', 'content', 'shopping', 'rising'];
    const results: Record<string, number | null | { error: string }> = {};

    for (const cat of categories) {
        const { count, error } = await supabaseAdmin
            .from('trends')
            .select('*', { count: 'exact', head: true })
            .eq('category', cat);

        if (error) {
            results[cat] = { error: error.message };
        } else {
            results[cat] = count;
        }
    }

    return NextResponse.json(results);
}
