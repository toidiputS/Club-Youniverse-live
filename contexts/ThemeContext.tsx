/**
 * @file This file defines the ThemeContext for the application.
 * It provides a global state for user settings (like theme, profile name, etc.),
 * persists these settings to localStorage, and applies the selected theme class to the document body.
 */

import React, { createContext, useState, useEffect, useMemo } from "react";
import type { Settings } from "../types";

// Default settings for a new user.
const defaultSettings: Settings = {
  theme: "dark",
  customCardBackground: null,
  defaultAspectRatio: "16:9",
  defaultStyleKeywords: "cinematic, 4k, high detail",
};

interface ThemeContextType {
  settings: Settings;
  setSettings: (settings: Settings) => void;
}

// Create the context with default values.
export const ThemeContext = createContext<ThemeContextType>({
  settings: defaultSettings,
  setSettings: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Initialize state by trying to load settings from localStorage.
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const storedSettings = localStorage.getItem("cys-settings");
      // Merge stored settings with defaults to ensure all keys are present
      const loaded = storedSettings ? JSON.parse(storedSettings) : {};
      return { ...defaultSettings, ...loaded };
    } catch (error) {
      console.error("Could not load settings from localStorage", error);
      return defaultSettings;
    }
  });

  // Effect that runs whenever the settings state changes.
  useEffect(() => {
    try {
      // Save the new settings to localStorage.
      localStorage.setItem("cys-settings", JSON.stringify(settings));
    } catch (error) {
      console.error("Could not save settings to localStorage", error);
    }

    // Apply the current theme class to the body element for CSS styling.
    document.body.className = ""; // Clear previous theme class.
    document.body.classList.add(`theme-${settings.theme}`);
  }, [settings]);

  // Memoize the context value to prevent unnecessary re-renders of consuming components.
  const value = useMemo(() => ({ settings, setSettings }), [settings]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
