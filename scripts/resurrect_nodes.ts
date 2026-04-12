import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resurrectNodes() {
    console.log("🕯️ Starting Resurrection Protocol...");

    // 1. Reset all ratings and statuses
    // We update every song that isn't currently playing to avoid race conditions
    const { error } = await supabase
        .from('songs')
        .update({
            status: 'pool',
            stars: 0,
            is_dsw: false,
            live_stars_sum: 0,
            live_stars_count: 0,
            upvotes: 0,
            downvotes: 0
        })
        .neq('status', 'now_playing');

    if (error) {
        console.error("❌ Resurrection failed:", error);
    } else {
        console.log("✨ All nodes have been resurrected and ratings reset to 0.");
        console.log("📈 Logic has been updated to support UNLIMITED and INCREMENTAL growth.");
    }
}

resurrectNodes();
