const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://ktfezfnkghtwbkmhxdyd.supabase.co";
const supabaseKey = "sb_publishable_Cpca6J3OdRz7czjQJN-KeQ_RNFc9QQU";

const supabase = createClient(supabaseUrl, supabaseKey);

async function resurrectNodes() {
    console.log("🕯️ Starting Resurrection Protocol...");

    const { data, error } = await supabase
        .from('songs')
        .update({
            status: 'pool',
            stars: 0,
            is_dsw: false,
            live_stars_sum: 0,
            live_stars_count: 0,
            upvotes: 0,
            downvotes: 0,
            box_rounds_lost: 0
        })
        .neq('status', 'now_playing');

    if (error) {
        console.error("❌ Resurrection failed:", error);
    } else {
        console.log("✨ All nodes have been resurrected and ratings reset to 0.");
    }
}

resurrectNodes();
