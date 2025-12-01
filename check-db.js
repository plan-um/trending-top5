const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const categories = ['keyword', 'social', 'content', 'overall'];

    for (const cat of categories) {
        const { data, error } = await supabase
            .from('trends')
            .select('count')
            .eq('category', cat);

        if (error) {
            console.error(`Error checking ${cat}:`, error);
        } else {
            console.log(`${cat} count:`, data.length);
            if (data.length > 0) {
                const { data: items } = await supabase.from('trends').select('*').eq('category', cat).limit(1);
                console.log(`${cat} sample:`, items[0]);
            }
        }
    }
}

checkData();
