import os
import time
import requests
import uuid
import sys
import random
from dotenv import load_dotenv
from supabase import create_client, Client
from openai import OpenAI

# Load environment variables (from .env file in the same directory)
load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
VOICEBOX_URL = "http://127.0.0.1:17493" # Local Voicebox API
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY") # Shared with Agent Zero or dedicated
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("🚨 ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    sys.exit(1)

# Supabase Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# LLM Client (OpenAI-compatible)
llm = None
if OPENAI_API_KEY:
    llm = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL)
else:
    print("⚠️ WARNING: OPENAI_API_KEY not found in .env. DJ Python will use fallback scripts.")

# Bot user ID tracking
_BOT_USER_ID = None

def get_bot_user_id() -> str:
    """Fetches the first admin's user_id to use for the bot's uploads."""
    global _BOT_USER_ID
    if _BOT_USER_ID: return _BOT_USER_ID
    
    try:
        response = supabase.table("profiles").select("user_id").eq("is_admin", True).limit(1).execute()
        if response.data and len(response.data) > 0:
            _BOT_USER_ID = response.data[0]["user_id"]
            return _BOT_USER_ID
            
    except Exception as e:
        print(f"❌ Failed to fetch uploader_id: {e}")
        
    return "00000000-0000-0000-0000-000000000000" # Dummy if fail

# --- AI DJ Script Generation ---

def generate_banter(prompt_context: str) -> str:
    """Uses LLM to generate contextual DJ banter or fallback to standard script."""
    if not llm:
        return "You're listening to Club Youniverse. Keeping the vibes high." # Fallback

    system_prompt = (
        "You are DJ Python, the resident AI DJ of 'Club Youniverse'. "
        "Your personality is witty, cool, a bit robotic but mostly hype. "
        "Your goal is to announce songs, celebrate high star ratings, mourn 'Dead Songs Walking', "
        "and remind people to visit 'clubyouniverse.live' to share and vote in 'The Box'. "
        "Keep your responses very short (1-2 sentences max). "
        "Do NOT use many emojis. Never use hashtags. Be direct."
    )

    try:
        completion = llm.chat.completions.create(
            model="gpt-4", # Or specific local model
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt_context}
            ],
            max_tokens=100
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"❌ LLM error: {e}")
        return "Energy levels peaking. Stay tuned to the frequency."

# --- Audio Engine ---

def generate_voicebox_audio(text: str) -> bytes:
    """Hits the local Voicebox TTS endpoint and returns the raw WAV/MP3 bytes."""
    print(f"🎙️ Generating Audio for: '{text}'")
    try:
        response = requests.get(
            f"{VOICEBOX_URL}/api/tts", 
            params={"text": text, "voice": "dj_python", "format": "mp3"}
        )
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"❌ Voicebox failed: {e}")
        return None

def upload_and_queue(text: str, title: str):
    """Generates audio, uploads it, and inserts it into the songs table."""
    audio_bytes = generate_voicebox_audio(text)
    if not audio_bytes: return

    filename = f"banter_{uuid.uuid4().hex[:8]}.mp3"
    storage_path = f"ai_dj/{filename}"
    
    try:
        # Upload
        supabase.storage.from_("songs").upload(
            file=audio_bytes,
            path=storage_path,
            file_options={"content-type": "audio/mpeg", "upsert": "true"}
        )
        public_url = supabase.storage.from_("songs").get_public_url(storage_path)
        
        # Insert
        uploader_id = get_bot_user_id()
        supabase.table("songs").insert({
            "uploader_id": uploader_id,
            "title": title,
            "artist_name": "DJ Python",
            "source": "ai_announcement",
            "audio_url": public_url,
            "duration_sec": 15,
            "status": "next_play", # Queue it up
            "cover_art_url": "https://i.pravatar.cc/150?u=djpython",
            "is_canvas": False
        }).execute()
        print(f"✅ Queued Announcement: {title}")
    except Exception as e:
        print(f"❌ Upload/Queue failed: {e}")

# --- Site Communication (Ticker/Chat) ---

def send_site_command(command_type: str, text: str):
    """Sends ticker or chat messages via Supabase Broadcasts."""
    try:
        command_id = f"dj-{uuid.uuid4().hex[:8]}"
        payload = {
            "type": command_type,
            "id": command_id,
            "timestamp": int(time.time() * 1000)
        }
        
        if command_type == "chat":
            payload["payload"] = {
                "id": command_id,
                "user": {"name": "DJ Python", "isAdmin": True},
                "text": text,
                "timestamp": int(time.time() * 1000)
            }
        else:
            payload["payload"] = {"text": text}
            
        supabase.table("broadcasts") \
            .update({"site_command": payload}) \
            .eq("id", "00000000-0000-0000-0000-000000000000") \
            .execute()
    except Exception as e:
        print(f"❌ Broadcast signal lost: {e}")

# --- Core Logic ---

_LAST_ANNOUNCED_SONG_ID = None
_LAST_HYPE_TIME = time.time()

def check_current_song():
    """Contextual banter when the song shifts."""
    global _LAST_ANNOUNCED_SONG_ID
    try:
        response = supabase.table("broadcasts").select("current_song_id").eq("id", "00000000-0000-0000-0000-000000000000").single().execute()
        if not response.data or not response.data.get("current_song_id"): return
            
        sid = response.data["current_song_id"]
        if sid == _LAST_ANNOUNCED_SONG_ID: return
            
        song_res = supabase.table("songs").select("*").eq("id", sid).single().execute()
        if not song_res.data: return
            
        song = song_res.data
        _LAST_ANNOUNCED_SONG_ID = sid
        
        if song.get("source") == "ai_announcement": return

        title = song.get("title", "Unknown")
        artist = song.get("artist_name", "Unknown Artist")
        stars = song.get("stars", 5)
        
        print(f"🎵 Song Shift: {title} by {artist} ({stars}★)")
        
        # Generate script via LLM
        prompt = f"React to the current song change. Title: '{title}', Artist: '{artist}', Rating: {stars}/10 stars. Witty radio DJ style."
        banter = generate_banter(prompt)
        
        # 1. Broadast Ticker
        send_site_command("dj_banter", banter)
        
        # 2. Occasional Voice Announcement (30% chance)
        if random.random() < 0.3:
            upload_and_queue(banter, f"Now Playing: {title}")

        # 3. Occasional Chat drop (20% chance)
        if random.random() < 0.2:
            send_site_command("chat", banter)
            
    except Exception as e:
        print(f"❌ Shift monitor error: {e}")

def check_for_dead_songs():
    """Polls for 'Dead Song Walking' events."""
    try:
        response = supabase.table("songs").select("*").eq("is_dsw", True).eq("dsw_announced", False).execute()
        songs = response.data
        if not songs: return

        for song in songs:
            prompt = f"Inform the club that '{song['title']}' by {song['artist_name']} has been marked as a 'Dead Song Walking' because it hit zero stars. Be cold and robotic about its failure."
            banter = generate_banter(prompt)
            
            upload_and_queue(banter, f"💀 DSW: {song['title']}")
            send_site_command("chat", f"DEAD SONG WALKING DETECTED: {song['title']}")
            supabase.table("songs").update({"dsw_announced": True}).eq("id", song["id"]).execute()

    except Exception as e:
        print(f"❌ DSW scanner error: {e}")

def check_hype_cycle():
    """Occasional general club hype."""
    global _LAST_HYPE_TIME
    if time.time() - _LAST_HYPE_TIME < 300: # Every 5 mins
        return

    _LAST_HYPE_TIME = time.time()
    prompt = "Give a general hype message for 'Club Youniverse'. Remind them to visit clubyouniverse.live, share the link, and use 'The Box' to take control of the aux."
    banter = generate_banter(prompt)
    
    send_site_command("dj_banter", banter)
    if random.random() < 0.5:
        upload_and_queue(banter, "Club Hype Bulletin")

def main():
    print("🎧 DJ Python Personality Module Online.")
    send_site_command("dj_banter", "DJ Python is syncing his audio processors...")
    
    while True:
        try:
            check_current_song()
            check_for_dead_songs()
            check_hype_cycle()
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"⚠️ Loop error: {e}")
            
        time.sleep(5)

if __name__ == "__main__":
    main()
