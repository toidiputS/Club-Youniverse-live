/**
 * @file This is the root component of the application for the Club Youniverse Launch.
 * It manages authentication and serves as the main entry point for the Club and DJ Booth.
 */

import React, { useState, useEffect } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { Radio as Club } from "./components/Radio";
import { DjBooth } from "./components/DjBooth";
import { Loader } from "./components/Loader";
import { AudioVisualizer } from "./components/AudioVisualizer";
import { SiteEffects } from "./components/SiteEffects";
import { Ticker } from "./components/Ticker";
import { TuneInOverlay } from "./components/TuneInOverlay";
import { PresenceAlerts } from "./components/PresenceAlerts";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UserProfileCard } from './components/UserProfileCard';
import { RadioProvider } from "./contexts/AudioPlayerContext";
import { Sidewalk } from "./components/Sidewalk";
import { supabase } from "./services/supabaseClient";
import type { Session, Profile, View } from "./types";
import { Analytics } from "@vercel/analytics/react";

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>("club");
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateSWFn, setUpdateSWFn] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);
  
  // Route state - determine if we're on sidewalk (public) or inside club
  const [isClubRoute, setIsClubRoute] = useState(false);
  
  // Check route on mount and hash change
  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash;
      setIsClubRoute(hash === "#/club" || hash === "#/club/" || window.location.pathname === "/club");
    };
    
    checkRoute();
    window.addEventListener("hashchange", checkRoute);
    
    return () => window.removeEventListener("hashchange", checkRoute);
  }, []);

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error && error.code !== "PGRST116") throw error;

        if (!data) {
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert([{
              user_id: userId,
              name: "New Listener",
              is_premium: false,
              is_artist: false,
              is_admin: false,
              stats: { plays: 0, uploads: 0, votes_cast: 0, graveyard_count: 0 }
            }])
            .select()
            .single();

          if (createError) throw createError;
          setProfile(newProfile);

        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error("Error fetching/creating profile:", err);
      } finally {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // PWA Update Listener
    const handleUpdateAvailable = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.updateSW) {
        setUpdateAvailable(true);
        setUpdateSWFn(() => customEvent.detail.updateSW);
      }
    };
    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdateApp = () => {
    if (updateSWFn) {
      updateSWFn(true); // Triggers the SW update and reloads the page
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const handleAdminLogin = () => {
    const mockProfile: Profile = {
      user_id: "god-mode-admin",
      name: "The Creator",
      is_premium: true,
      is_artist: true,
      is_admin: true,
      roast_consent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stats: { plays: 999999, uploads: 999, votes_cast: 999, graveyard_count: 0 }
    };
    setProfile(mockProfile);
    setSession({ user: { id: "god-mode-admin" } } as Session);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <Loader message="Tuning in to Club Youniverse..." />
      </div>
    );
  }

  // SIDWALK VIEW - Public landing page (no auth required)
  // Show sidewalk if: on root path OR explicitly on sidewalk route OR not logged in (but can still view)
  if (!isClubRoute || !session) {
    // Show the sidewalk landing page for everyone
    return (
      <ThemeProvider>
        <Sidewalk />
        <Analytics />
      </ThemeProvider>
    );
  }

  // CLUB VIEW - Premium members only
  // If on /club route but not logged in, redirect to sidewalk which has login
  if (isClubRoute && (!session || !profile)) {
    window.location.hash = "#/";
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <Loader message="Redirecting..." />
      </div>
    );
  }

  // Check if user can access the club (premium or admin)
  const canAccessClub = profile?.is_premium || profile?.is_admin;

  if (!canAccessClub) {
    // User is logged in but not premium - show message or redirect
    return (
      <ThemeProvider>
        <Sidewalk />
        <Analytics />
      </ThemeProvider>
    );
  }

  // CLUB VIEW - Premium experience
  return (
    <ThemeProvider>
      <RadioProvider profile={profile} setProfile={setProfile}>
        <AudioVisualizer />
        <SiteEffects />
        <TuneInOverlay />

        {/* PWA Update Prompt */}
        {updateAvailable && (
          <div className="fixed top-0 left-0 right-0 z-[9999] p-4 flex justify-center pointer-events-none animate-fade-in-down">
            <div className="bg-zinc-900 border border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.3)] rounded-2xl p-4 flex items-center gap-4 pointer-events-auto max-w-sm w-full">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>

              <div className="flex-grow">
                <h3 className="text-white text-[12px] font-black uppercase tracking-wider mb-0.5">Club Update Ready</h3>
                <p className="text-zinc-400 text-[10px] font-medium leading-tight">A new version of Youniverse is available. Update now to fix issues and load fresh code.</p>
              </div>

              <button
                onClick={handleUpdateApp}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors shrink-0"
              >
                Reload
              </button>

            </div>
          </div>
        )}

        <div className="h-[100dvh] relative z-10 flex flex-col overflow-y-auto overflow-x-hidden text-white w-full pb-14">
          <main className="flex-grow flex flex-col relative w-full h-full">
            {currentView === "club" ? (
              <div className="h-full w-full overflow-hidden absolute inset-0">
                <Club onNavigate={setCurrentView} onSignOut={handleSignOut} profile={profile} />
              </div>

            ) : currentView === "profile" ? (
              <div className="h-full w-full overflow-hidden absolute inset-0">
                <UserProfileCard
                  userId={profile.user_id}
                  onClose={() => setCurrentView("club")}
                  isCurrentUser={true}
                />
              </div>

            ) : (
              <DjBooth onNavigate={setCurrentView} />
            )}

          </main>

          {/* FULL WIDTH BOTTOM TICKERS */}
          <div className="fixed bottom-0 left-0 w-full z-50">
            <Ticker />
          </div>

        </div>

        <PresenceAlerts profile={profile} />
        <Analytics />
      </RadioProvider>
    </ThemeProvider>
  );
};

export default App;
