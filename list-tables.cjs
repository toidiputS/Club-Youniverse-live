const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://ktfezfnkghtwbkmhxdyd.supabase.co";
const supabaseKey = "sb_publishable_Cpca6J3OdRz7czjQJN-KeQ_RNFc9QQU";

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log('--- TABLE LIST ---');
    // We can't list tables directly with the client but we can try to query the information_schema via RPC if it exists,
    // or just try common names.
    // Better yet, let's just try to query 'songs' and see if we get ANY rows by removing any filters.
    const { data: songsData, error: songsError } = await supabase.from('songs').select('*');
    if (songsError) {
        console.log('Error querying songs:', songsError);
    } else {
        console.log('Songs columns:', songsData.length > 0 ? Object.keys(songsData[0]) : 'No data');
        console.log('Row count:', songsData.length);
    }

    const { data: lbData, error: lbError } = await supabase.from('youniversal_leaderboard').select('*');
    if (lbError) {
        console.log('Error querying youniversal_leaderboard:', lbError);
    } else {
        console.log('Leaderboard columns:', lbData.length > 0 ? Object.keys(lbData[0]) : 'No data');
        console.log('Row count:', lbData.length);
    }

    const { data: brData, error: brError } = await supabase.from('broadcasts').select('*');
    if (brError) {
        console.log('Error querying broadcasts:', brError);
    } else {
        console.log('Broadcasts row count:', brData.length);
        if (brData.length > 0) {
            console.log('First Broadcast ID:', brData[0].id);
            console.log('Leader ID:', brData[0].leader_id);
            console.log('Last Heartbeat:', brData[0].last_heartbeat);
        }
    }
}

listTables();
