import { ChoreographedLine, AnimationType, Song } from "../types";
import { supabase } from "./supabaseClient";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export class LyricService {
    /**
     * Generate raw lyrics for a song if they are missing.
     */
    static async generateLyrics(title: string, artist: string, duration: number): Promise<string[]> {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.warn("⚠️ Gemini API Key missing, using AI-VJ fallback patterns.");
            return ["(Instrumental / No Lyrics Found)"];
        }

        const prompt = `Write the lyrics for the song "${title}" by ${artist} (${duration}s duration). 
        Format as a simple list of lines. 
        Only return the lyrics, no introduction. 
        If it's an instrumental, return [Instrumental].`;

        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            return text.split("\n").filter((l: string) => l.trim().length > 0);
        } catch (e) {
            console.error("Gemini Lyrics Error:", e);
            return ["(Lyric sync unavailable)"];
        }
    }

    /**
     * Takes plain text lyrics and turns them into a VJ-ready choreography JSON.
     */
    static async choreographLyrics(lines: string[], duration: number = 180): Promise<ChoreographedLine[]> {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey || lines.length === 0 || lines[0].includes("No Lyrics")) {
            return this.generateAutoChoreography(lines, duration);
        }

        const prompt = `You are a professional VJ Choreographer. 
        Convert these lyrics into a visual sequence for a music visualizer.
        Total duration specified: ${duration} seconds.
        
        LYRICS:
        ${lines.join("\n")}
        
        RETURN ONLY A JSON ARRAY of objects. Each object must have:
        {
          "time": number (the start time in seconds for this line),
          "text": "the exact string from the lyrics",
          "meta": {
            "color": "a hex code matching the vibe",
            "animation": "fade" | "slide" | "bounce" | "typewriter" | "glitch" | "explode" | "shake",
            "scale": number (0.8 to 2.0),
            "rotation": number (-15 to 15),
            "fontFamily": "sans" | "marker" | "tech",
            "sentiment": "bright" | "energetic" | "calm" | "dark",
            "secondaryText": "optional background echo word"
          }
        }
        
        Distribute lines logically across the ${duration}s duration.`;

        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { 
                        responseMimeType: "application/json",
                        temperature: 0.7
                    }
                })
            });

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const choreographed = this.extractJson(text);

            if (choreographed.length === 0) return this.generateAutoChoreography(lines, duration);

            return choreographed.map((l: any, i: number) => ({
                id: `line-${i}-${Date.now()}`,
                time: Number(l.time) || (i * (duration / choreographed.length)),
                text: l.text || lines[i] || "",
                meta: {
                    color: l.meta?.color || "#ffffff",
                    animation: (l.meta?.animation as AnimationType) || AnimationType.FADE,
                    scale: l.meta?.scale || 1,
                    rotation: l.meta?.rotation || 0,
                    fontFamily: l.meta?.fontFamily || 'sans',
                    sentiment: l.meta?.sentiment || 'bright',
                    secondaryText: l.meta?.secondaryText
                }
            }));
        } catch (e) {
            console.warn("Choreography API failed, falling back to auto-VJ.", e);
            return this.generateAutoChoreography(lines, duration);
        }
    }

    /**
     * Compatibility helper to parse whatever comes from the DB
     */
    static parseLyrics(raw: any): ChoreographedLine[] {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed)) {
                return parsed.map((item, i) => ({
                    id: item.id || `p-${i}`,
                    time: typeof item.time === 'number' ? item.time : i * 5,
                    text: item.text || "",
                    meta: {
                        color: item.meta?.color || '#ffffff',
                        animation: (item.meta?.animation as AnimationType) || AnimationType.FADE,
                        scale: item.meta?.scale || 1,
                        rotation: item.meta?.rotation || 0,
                        fontFamily: item.meta?.fontFamily || 'sans',
                        sentiment: item.meta?.sentiment || 'bright'
                    }
                }));
            }
        } catch (e) {
            // Not JSON
        }
        return [];
    }

    /**
     * Internal: Extracts and parses JSON from the model response.
     */
    private static extractJson(text: string): any[] {
        try {
            const cleanText = text.replace(/```json\s?|```/g, "").trim();
            const match = cleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);
            const jsonStr = match ? match[0] : cleanText;
            const parsed = JSON.parse(jsonStr);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    private static generateAutoChoreography(lines: string[], duration: number): ChoreographedLine[] {
        if (!lines || lines.length === 0) return [];
        const lineDuration = Math.max(3, duration / lines.length);
        return lines.map((text, i) => ({
            id: `auto-${i}-${Date.now()}`,
            time: i * lineDuration,
            text: text.trim(),
            meta: {
                color: ["#00f3ff", "#ff00aa", "#ccff00", "#bf00ff"][i % 4],
                animation: [AnimationType.SLIDE, AnimationType.BOUNCE, AnimationType.FADE][i % 3],
                scale: 1,
                rotation: (i % 2 === 0 ? 3 : -3),
                fontFamily: 'tech'
            }
        }));
    }

    /**
     * The master orchestrator for missing lyrics.
     * Fetches, choreographs, and saves back to the DB.
     */
    static async processMissingLyrics(song: Song): Promise<ChoreographedLine[] | null> {
        console.log(`🎤 LyricService: Processing lyrics for "${song.title}"...`);
        try {
            // 1. Generate text
            const rawLines = await this.generateLyrics(song.title, song.artistName, song.durationSec || 180);
            if (!rawLines || rawLines.length === 0) return null;

            // 2. Choreograph
            const choreographed = await this.choreographLyrics(rawLines, song.durationSec || 180);
            if (!choreographed || choreographed.length === 0) return null;

            // 3. Save to DB
            const { error } = await supabase
                .from("songs")
                .update({ lyrics: choreographed })
                .eq("id", song.id);

            if (error) {
                console.error("❌ Failed to sync lyrics to DB:", error);
            } else {
                console.log(`✅ Lyrics processed and saved for "${song.title}"`);
            }
            return choreographed;
        } catch (e) {
            console.error("❌ processMissingLyrics unexpected error:", e);
            return null;
        }
    }

    /**
     * Map plain text to default choreography
     */
    static plainToChoreography(text: string, duration: number = 180): ChoreographedLine[] {
        const lines = text.split("\n").filter(l => l.trim().length > 0);
        if (lines.length === 0) return [];

        const interval = duration / lines.length;
        return lines.map((text, i) => ({
            id: `manual-${i}-${Date.now()}`,
            time: Number((i * interval).toFixed(2)),
            text: text.trim(),
            meta: {
                color: "#00f3ff",
                animation: AnimationType.SLIDE,
                scale: 1,
                rotation: 3,
                fontFamily: "tech"
            }
        }));
    }

    /**
     * Convert JSON choreography back to plain text for easy editing
     */
    static choreographyToPlain(json: any): string {
        if (!json) return "";
        let input = json;
        if (typeof json === 'string') {
            try {
                input = JSON.parse(json);
            } catch (e) {
                return json; // Already plain text
            }
        }
        if (Array.isArray(input)) {
            return input.map((l: any) => l.text || "").join("\n");
        }
        return String(json);
    }
}
