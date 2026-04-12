import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { Lock, Sparkles, CheckCircle2, Flame, Loader2, ArrowRight } from 'lucide-react';
import { StripeService } from '../services/StripeService';
import type { Profile } from '../types';

interface TheDoorProps {
    profile: Profile;
    onAccessGranted: () => void;
}

export const TheDoor: React.FC<TheDoorProps> = ({ profile, onAccessGranted }) => {
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<'checking' | 'unpaid' | 'paid' | 'founder'>('checking');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const checkAccess = async () => {
            // Check for Stripe return flags
            if (window.location.hash.includes('entry=success')) {
                setProcessing(true);
                // Wait 2 seconds for webhook to potentially settle
                await new Promise(r => setTimeout(r, 2000));
                window.location.hash = '#/club'; // Clean up
            }

            if (profile.is_admin || profile.is_first_100) {
                setStatus('founder');
                setLoading(false);
                return;
            }

            // Check if user has a valid daily pass
            const { data: passes } = await supabase
                .from('daily_passes')
                .select('*')
                .eq('user_id', profile.user_id)
                .gt('expires_at', new Date().toISOString())
                .order('expires_at', { ascending: false })
                .limit(1);

            if (passes && passes.length > 0) {
                setStatus('paid');
                setProcessing(false);
                setLoading(false);
                // Auto-enter if already paid
                setTimeout(onAccessGranted, 1500);
            } else {
                setStatus('unpaid');
                setProcessing(false);
                setLoading(false);
            }
        };

        checkAccess();
    }, [profile, onAccessGranted]);

    const handleOneClickEntry = async () => {
        setProcessing(true);
        try {
            // Live Stripe Integration for $1.00 Daily Pass
            const DAILY_PASS_PRICE_ID = 'price_1TLJs1Q4KbuvG3PnKcLIsaYW';
            await StripeService.createCheckoutSession(profile.user_id, DAILY_PASS_PRICE_ID);
            
            // Note: After redirect, the user will come back with #entry=success
            // and the webhook will have processed the pass.
        } catch (err) {
            console.error("Payment initiation failed:", err);
            alert("Digital stamp initiation failed. Please check your connectivity.");
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-black">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md z-10"
            >
                <div className="bg-[#111] border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                    
                    {/* Founder Glow */}
                    {status === 'founder' && (
                        <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none" />
                    )}

                    <div className="text-center relative z-10">
                        {status === 'founder' ? (
                            <div className="mb-8">
                                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                                    <Sparkles className="w-10 h-10 text-emerald-500" />
                                </div>
                                <h1 className="text-3xl font-black text-white tracking-tighter mb-2">WELCOME, FOUNDER</h1>
                                <p className="text-emerald-500/60 font-mono text-[10px] uppercase tracking-[0.3em]">Lifetime Access Granted</p>
                            </div>
                        ) : status === 'paid' ? (
                            <div className="mb-8">
                                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                                    <CheckCircle2 className="w-10 h-10 text-blue-500" />
                                </div>
                                <h1 className="text-3xl font-black text-white tracking-tighter mb-2">STAMP VERIFIED</h1>
                                <p className="text-blue-500/60 font-mono text-[10px] uppercase tracking-[0.3em]">Entry Valid for 24h</p>
                            </div>
                        ) : (
                            <div className="mb-8">
                                <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/20">
                                    <Lock className="w-10 h-10 text-purple-400" />
                                </div>
                                <h1 className="text-3xl font-black text-white tracking-tighter mb-2">THE VELVET ROPE</h1>
                                <p className="text-purple-400/60 font-mono text-[10px] uppercase tracking-[0.3em]">$1.00 Daily Cover Charge</p>
                            </div>
                        )}

                        <div className="space-y-4 mb-10">
                            {status === 'founder' ? (
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    You were one of the first 100 to arrive. The club is your home, forever. 
                                    Step inside and lead the floor.
                                </p>
                            ) : status === 'unpaid' ? (
                                <div className="bg-black/40 rounded-2xl p-6 border border-white/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Flame className="w-4 h-4 text-orange-500" />
                                            <span className="text-xs font-bold text-white uppercase tracking-wider">Current Streak</span>
                                        </div>
                                        <span className="text-lg font-black text-white">{profile.current_streak || 0}d</span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                                        <div className="h-full bg-orange-500" style={{ width: `${((profile.current_streak || 0) % 21) / 21 * 100}%` }} />
                                    </div>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest text-left">
                                        {21 - ((profile.current_streak || 0) % 21)} days until 4th week free incentive
                                    </p>
                                </div>
                            ) : (
                                <p className="text-zinc-400 text-sm">Opening the airlocks...</p>
                            )}
                        </div>

                        {status === 'unpaid' && (
                            <button
                                onClick={handleOneClickEntry}
                                disabled={processing}
                                className="w-full bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs shadow-xl shadow-white/5"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        {profile.stripe_customer_id ? (
                                            <div className="flex flex-col items-center">
                                                <span>Enter Club ($1.00)</span>
                                                <span className="text-[8px] opacity-60">One-Click Card on File</span>
                                            </div>
                                        ) : (
                                            <>
                                                Pay Cover ($1.00)
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </>
                                )}
                            </button>
                        )}

                        {status === 'founder' && (
                            <button
                                onClick={onAccessGranted}
                                className="w-full bg-emerald-500 text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all active:scale-95 uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20"
                            >
                                Enter Club
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                        
                        <button 
                            onClick={() => window.location.hash = ""}
                            className="mt-6 text-xs font-bold text-zinc-600 hover:text-white uppercase tracking-widest transition-colors"
                        >
                            Return to Sidewalk
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
