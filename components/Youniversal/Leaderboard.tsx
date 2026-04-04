import { useEffect } from 'react';
import { useGameStore } from './useGameStore';
import { Trophy } from 'lucide-react';

export function YouniversalLeaderboard() {
    const leaderboard = useGameStore((state) => state.leaderboard);
    const fetchLeaderboard = useGameStore((state) => state.fetchLeaderboard);

    useEffect(() => {
        fetchLeaderboard();
        // Refresh every minute to keep it live
        const interval = setInterval(fetchLeaderboard, 60000);
        return () => clearInterval(interval);
    }, [fetchLeaderboard]);

    return (
        <div className="bg-black/40 backdrop-blur-md rounded-xl p-3 border border-white/5 shadow-2xl pointer-events-auto select-none min-w-[200px]">
            <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                <Trophy className="w-3 h-3 text-yellow-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                    Leaderboard
                </span>
            </div>
            
            <div className="space-y-1.5">
                {leaderboard.slice(0, 3).map((entry, index) => (
                    <div 
                        key={entry.name} 
                        className="flex items-center justify-between group transition-all"
                    >
                        <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-bold w-3 h-3 flex items-center justify-center rounded-full ${
                                index === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                                index === 1 ? 'bg-zinc-400/20 text-zinc-400' : 
                                'bg-orange-700/20 text-orange-700'
                            }`}>
                                {index + 1}
                            </span>
                            <span className="text-[10px] font-bold text-white/80 group-hover:text-white transition-colors truncate max-w-[100px]">
                                {entry.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-black text-purple-400">
                                {entry.wins}
                            </span>
                            <span className="text-[7px] font-bold uppercase text-white/20 tracking-tighter">
                                WINS
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-2 pt-2 border-t border-white/5 flex justify-center">
                <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.3em]">
                    Club Youniverse Live
                </span>
            </div>
        </div>
    );
}
