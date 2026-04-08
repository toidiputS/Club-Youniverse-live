/**
 * @file This is the main entry point for the React application.
 * It finds the root HTML element and renders the main <App /> component into it.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { registerServiceWorker } from "./sw-register";
import "./index.css";

// Get the root element from the HTML where the React app will be mounted.
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Register the minimal, safe service worker for PWA support
registerServiceWorker();

// Nuclear option to kill any stray audio from previous HMR sessions
if (typeof window !== 'undefined') {
  const killStrayAudio = () => {
    const audios = document.querySelectorAll('audio');
    audios.forEach(a => {
      a.pause();
      a.src = "";
      a.remove();
    });
    // Also check globalThis
    const leakedAudio = (globalThis as any).__CLUB_YOUNIVERSE_AUDIO__;
    if (leakedAudio) {
      leakedAudio.pause();
      leakedAudio.src = "";
    }
  };
  killStrayAudio();
}

// Create a React root and render the main App component.
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
