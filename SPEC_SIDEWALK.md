# Club Youniverse - Sidewalk Landing Page

## Concept & Vision

**"The Curb"** - You're standing on the sidewalk outside Club Youniverse. The bass is thumping, neon signs flickering, people vibing inside. You can hear everything, see the energy, chat with other listeners on the street. But the velvet rope keeps you from the dance floor - that's for members only.

The sidewalk is **gritty, urban, raw** - exposed brick textures, flickering neon, late-night energy. Not corporate glossy. Real underground club vibes.

---

## Design Language

### Aesthetic Direction
**Urban underground nightclub exterior** - Think brick walls, spray paint, neon signs, streetlights, maybe some graffitied tags. The aesthetic of a venue that's exclusive but inviting.

### Color Palette
- **Primary**: `#FF2D55` (hot pink neon)
- **Secondary**: `#00F5FF` (cyan neon)
- **Accent**: `#FFE600` (warning yellow)
- **Background**: `#0A0A0F` (deep night black)
- **Surface**: `#1A1A24` (dark concrete)
- **Text Primary**: `#FFFFFF`
- **Text Secondary**: `#8888AA` (street lamp dim)

### Visual Elements
- Brick/concrete textures (CSS patterns)
- Flickering neon sign effects (CSS animation)
- Street lamp glow effects
- Graffiti-style accents
- Fog/smoke overlays

### Motion Philosophy
- Neon flicker: subtle, random timing
- Pulsing glow on active elements
- Smooth entrance animations
- Chat messages slide in from sides

---

## Layout & Structure

### Hero Section - "The Street View"
- Graffiti-style "CLUB YOUNIVERSE" header
- Flickering neon sign with club name
- Now Playing card (full audio for free)
- Listener count with live pulse
- "Join the Frequency" audio toggle

### Free Chat Section - "The Sidewalk Crowd"
- Real-time chat for curb listeners
- Anonymous usernames
- "X listeners on the curb" indicator

### What's Playing Card
- Current + next songs visible
- "X more songs in the box" count
- No voting controls (free tier)

### Premium CTA - "The Velvet Rope"
- Premium benefits list
- Price: $19.99/month
- Clear "Enter the Club" button
- Rope/barrier visual element

---

## Technical Approach

### Routing
- `/` → Sidewalk (public, no auth required)
- `/club` → Full app (requires premium or redirect)
- Auth state checked on route change

### State Management
- RadioContext for now playing, listeners, queue
- Supabase for public chat broadcast

### Audio
- Same audio source as main app
- Full listen access for free users

### Premium Detection
- Check `profile.is_premium` from Supabase
- Redirect free users attempting `/club` access
