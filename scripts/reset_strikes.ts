import { supabase } from '../services/supabaseClient';

async function resetStrikes() {
    const { error } = await supabase
        .from('songs')
        .update({ box_rounds_lost: 0 })
        .eq('is_dsw', true);
    
    if (error) console.error(error);
    else console.log("✅ Strikes reset for all DSW songs. They now have 3 chances.");
}

resetStrikes().then(() => process.exit());
