import React, { useContext } from "react";
import { RadioContext } from "../contexts/AudioPlayerContext";
import { VolumeX, Volume1, Volume2 } from "lucide-react";

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

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMute}
          className="w-5 h-5 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted || volume === 0 ? <VolumeX size={14} /> : (volume < 0.5 ? <Volume1 size={14} /> : <Volume2 size={14} />)}
        </button>
        
        <div className="flex items-center w-12 sm:w-20">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className={`volume-slider w-full h-1 rounded-full appearance-none cursor-pointer transition-all ${
                isMuted ? 'opacity-30' : 'opacity-100'
            } accent-purple-500 hover:accent-purple-400`}
            aria-label="Volume slider"
          />
        </div>
      </div>

      <style>{`
        .volume-slider::-webkit-slider-thumb {
          appearance: none;
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 5px rgba(168, 85, 247, 0.5);
          border: none;
        }
        .volume-slider::-moz-range-thumb {
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 5px rgba(168, 85, 247, 0.5);
        }
      `}</style>
    </>
  );
};
