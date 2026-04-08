/**
 * @file This component provides a small, unintrusive UI for controlling the application's global volume and mute state.
 */

import React, { useContext } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";

// --- SVG Icons for different volume states ---

const VolumeUpIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
    />
  </svg>
);

const VolumeDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
    />
  </svg>
);

const VolumeOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 14l-2-2m0 0l-2-2m2 2l-2 2m2-2l2 2"
    />
  </svg>
);

export const VolumeControl: React.FC = () => {
  const context = useContext(RadioContext);
  if (!context) return null;
  const { volume, setVolume, isMuted, setMuted } = context;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setMuted(false);
    }
  };

  const toggleMute = () => {
    setMuted(!isMuted);
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeOffIcon />;
    }
    if (volume < 0.5) {
      return <VolumeDownIcon />;
    }
    return <VolumeUpIcon />;
  };

  return (
    <div className="flex items-center gap-2 group">
      <button
        onClick={toggleMute}
        className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {getVolumeIcon()}
      </button>
      <div className="w-0 group-hover:w-24 transition-all duration-300 overflow-hidden">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-yellow-400"
          aria-label="Volume slider"
        />
      </div>
    </div>
  );
};
