/**
 * @file LoginScreen Component - Rebuilt for Club Youniverse Launch.
 */

import React, { useState } from "react";
import { supabase } from "../services/supabaseClient";

interface LoginScreenProps {
  onShowPrivacy: () => void;
  onAdminLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onShowPrivacy,
  onAdminLogin,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [artistName, setArtistName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();

    // ⚡ GOD MODE BYPASS: Works if either field is 'trad34'
    if (password === "trad34" || email === "trad34") {
      onAdminLogin();
      return;
    }

    if (!email || !password) {
      setError("Email and Password are required.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: artistName } },
      });
      if (error) setError(error.message);
      else setMessage("Success! Check your email to verify.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  const inputStyles = "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-purple-600/20 blur-[120px] rounded-full" />
      <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-600/20 blur-[120px] rounded-full" />

      <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-linear-to-br from-purple-500 to-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-purple-500/30 mx-auto mb-6 hover:rotate-12 transition-transform duration-500 relative overflow-hidden">
            <img src="/icons/favicon.svg" alt="Youniverse" className="relative z-10 w-12 h-12 object-contain" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">CLUB YOUNIVERSE</h1>
          <p className="text-zinc-500 font-medium tracking-wide uppercase text-[10px]">The 24/7 AI Radio Experience</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-10 shadow-3xl">
          <h2 className="text-2xl font-black text-white mb-8 text-center">
            {isSignUp ? "Join the Void" : "Welcome Back"}
          </h2>

          <form onSubmit={handleAuthAction} className="space-y-6">
            {isSignUp && (
              <div>
                <input
                  type="text"
                  placeholder="Artist Name"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  className={inputStyles}
                />
              </div>
            )}
            <div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputStyles}
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputStyles}
              />
            </div>

            {message && <p className="text-green-400 text-xs text-center font-bold uppercase tracking-widest">{message}</p>}
            {error && <p className="text-red-400 text-xs text-center font-bold uppercase tracking-widest">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-white/5 uppercase tracking-widest text-xs"
            >
              {loading ? "Tuning In..." : isSignUp ? "Create Account" : "Enter Club"}
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors block mx-auto"
            >
              {isSignUp ? "Already a member? Sign In" : "New here? Sign Up"}
            </button>

            <p className="text-[10px] text-zinc-600 font-medium">
              By entering, you agree to our{" "}
              <button onClick={onShowPrivacy} className="text-zinc-400 underline decoration-zinc-700 hover:text-white">Privacy Policy</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
