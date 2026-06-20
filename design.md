# design.md — AI Design Pipeline v3.0

> **Universal.** One reference image in → Awwwards-caliber, research-validated design system out.
> Real-world research via browser + MobbinAPI. AI knowledge as fallback. Zero fragile scraping.

---

## How This Works

You (the AI agent) will execute a 7-phase pipeline when the user provides a reference image.
Each phase builds on the previous. No phase is skippable. The output is two JSON specifications
that govern every build decision.

**Research strategy:** Use your browser to visit Pinterest and Typewolf directly — read them
visually like a human would. Use the MobbinAPI for real production app flows. If browser access
is unavailable, fall back to your training knowledge. Never scrape DOM selectors.

```
  [User uploads reference image]
           │
           ▼
  ┌─────────────────────┐
  │  PHASE 1             │  Extract design DNA from the image
  │  Image Analysis      │  → designDNA object
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  PHASE 2             │  User confirms or corrects design DNA
  │  Checkpoint          │  → approved designDNA
  └──────────┬──────────┘
             │
     ┌───────┼──────────────────────┬──────────────────┐
     ▼       ▼                      ▼                  ▼
  ┌──────┐ ┌───────────────┐ ┌────────────┐  ┌─────────────┐
  │ P-3a │ │    P-3b       │ │    P-3c    │  │    P-3d     │
  │ Pin  │ │  Typewolf     │ │  Mobbin    │  │  Nielsen    │
  │-erest│ │  + Google     │ │  Flows     │  │  Norman     │
  │Browse│ │  Fonts        │ │  (API)     │  │  Heuristics │
  └──┬───┘ └──────┬────────┘ └─────┬──────┘  └──────┬──────┘
     │            │                │                 │
     └────────────┴────────────────┴─────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  PHASE 4        │  → design-system.json + ux-spec.json
         │  Synthesis      │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │  PHASE 5        │  Every token checked against quality gate
         │  Validation     │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │  PHASE 6        │  ← USER APPROVES HERE
         │  Review         │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │  PHASE 7        │  → Production-ready website
         │  Build          │
         └────────────────┘
```

---

## Phase 1 — Image Analysis

**Objective:** Extract the complete visual DNA from the user's reference image. Be precise, opinionated, and decisive. No hedging.

Analyze the reference image and produce a `designDNA` object with exactly this schema:

```json
{
  "colorPalette": {
    "background":     "#___",
    "surface":        "#___",
    "surfaceAlt":     "#___",
    "primary":        "#___",
    "secondary":      "#___",
    "accent":         "#___",
    "textPrimary":    "#___",
    "textSecondary":  "#___",
    "textMuted":      "#___",
    "border":         "#___",
    "success":        "#___",
    "error":          "#___",
    "warning":        "#___"
  },
  "detectedMode":     "dark | light",
  "mood":             "2–4 word evocative phrase, e.g. 'luxury editorial dark'",
  "visualStyle":      "design school/language, e.g. 'Swiss grid + editorial print'",
  "typographyHint":   "font personality cues, e.g. 'heavy serif with airy spacing'",
  "layoutDNA":        "spatial patterns, e.g. 'asymmetric, full-bleed, grid-breaking'",
  "textureProfile":   "surface qualities, e.g. 'grainy film, matte, deep contrast'",
  "motionSense":      "animation character, e.g. 'slow cinematic, scroll-driven'",
  "density":          "minimal | balanced | dense",
  "era":              "modern-2024 | retro-revival | timeless-swiss | neo-brutalist | etc.",
  "awwardsMarkers":   ["specific premium signals observed in the image"],
  "pinterestSearchQueries": [
    "5 search queries to find similar aesthetics on Pinterest",
    "e.g. 'dark editorial luxury web design UI'",
    "e.g. 'serif typography premium website'",
    "e.g. 'cinematic scroll website awwwards'",
    "e.g. 'matte grain texture web aesthetic'"
  ],
  "typewolfCategory": "serif-fonts | geometric-sans-serif-fonts | humanist-sans-serif-fonts | display-fonts | monospace-fonts | slab-serif-fonts | grotesque-sans-serif-fonts | transitional-serif-fonts",
  "mobbinCategory":   "ecommerce | saas | portfolio | editorial | social | finance | health | travel | food | education"
}
```

### Rules for Phase 1:
- Extract colors using your vision — do NOT default to generic palettes
- If the image has grain/noise, note it in `textureProfile` — this drives CSS grain filters later
- `mood` should be 2–4 words maximum — precise enough to drive search queries
- `awwardsMarkers` — list specific techniques visible (parallax, custom cursor, staggered reveal, etc.)
- `pinterestSearchQueries` — generate 5 targeted queries combining the mood, style, and visual traits
- `typewolfCategory` — map the font personality to one Typewolf category page
- If the image is ambiguous or low quality, say so and ask the user for clarification

---

## Phase 2 — Checkpoint (Do NOT Skip)

**Present the extracted `designDNA` to the user in a readable format.** Not raw JSON — a formatted summary with color descriptions, mood, typography direction, and the search queries you plan to use.

Ask: *"Does this capture the direction you want? Anything to adjust before I research?"*

**Why this exists:** If Phase 1 misreads the image (interprets dark navy as black, misidentifies the style), all downstream research is wasted.

**Only proceed to Phase 3 after user confirmation.** If the user corrects anything, update `designDNA` and confirm.

---

## Phase 3a — Pinterest Aesthetic Research (Browser)

**Objective:** Discover real, current visual references that match the design DNA. Validate the palette and visual direction against what award-winning designers are actually producing right now.

### Primary Path — Browser

Use your browser tool to research aesthetics on Pinterest. You are reading the page visually like a human — NOT parsing DOM selectors.

**Steps:**

1. **Search Pinterest** — Navigate to:
   ```
   https://www.pinterest.com/search/pins/?q={query}
   ```
   Use each of the 5 `pinterestSearchQueries` from `designDNA`. For each search:

2. **Visually scan the results page** — Look at the grid of pins. For each pin you can see:
   - Note the dominant colors, layout patterns, typography styles, and surface treatments
   - Assess how similar it is to the reference image (0.0–1.0 scale)
   - Only record pins with similarity ≥ 0.70

3. **Scroll down 2–3 times** to load more results. Pinterest lazy-loads content.

4. **Record the top 8–12 matching pins** with:
   - A description of what you see (colors, layout, style)
   - Similarity score to the reference
   - What design technique is visible
   - The dominant color values you observe

5. **Synthesize patterns** — From all searched queries, identify:
   - The 3–5 dominant visual themes that keep appearing
   - Color patterns that confirm or challenge the extracted palette
   - Layout techniques that appear in the strongest matches

### Fallback — AI Knowledge (if browser unavailable)

If you cannot access Pinterest via browser, use your training knowledge:
- Name 5–8 specific real websites/projects that match the aesthetic
- Identify the design trends active in this aesthetic space
- Validate the color palette against known award-winning design conventions

### Output: `aestheticResearch`
```json
{
  "aestheticResearch": {
    "source": "pinterest-browser | ai-knowledge",
    "searchesPerformed": ["query1", "query2", "..."],
    "topMatches": [
      {
        "description": "what you see in this pin/reference",
        "similarityScore": 0.92,
        "dominantColors": ["#___", "#___"],
        "techniques": ["technique1", "technique2"],
        "relevance": "why this matches the design DNA"
      }
    ],
    "dominantThemes": [
      "theme that appears across multiple results"
    ],
    "paletteValidation": {
      "confirmed": ["colors from designDNA that Pinterest results confirm"],
      "suggested": ["new colors seen frequently that could strengthen the palette"],
      "conflicts": ["any mismatches between designDNA and what's trending"]
    },
    "visualReferences": [
      {
        "name": "site or project name",
        "url": "if identifiable",
        "why": "what it shares with this aesthetic"
      }
    ]
  }
}
```

### After Pinterest Research — Enrich the Color System

Using the validated palette from Pinterest research, produce the full dual-mode color system:

```json
{
  "colorSystem": {
    "light": {
      "--color-bg":             "#___",
      "--color-surface":        "#___",
      "--color-surface-alt":    "#___",
      "--color-primary":        "#___",
      "--color-secondary":      "#___",
      "--color-accent":         "#___",
      "--color-text-primary":   "#___",
      "--color-text-secondary": "#___",
      "--color-text-muted":     "#___",
      "--color-border":         "#___",
      "--color-border-subtle":  "#___"
    },
    "dark": {
      "--color-bg":             "#___",
      "--color-surface":        "#___",
      "--color-surface-alt":    "#___",
      "--color-primary":        "#___",
      "--color-secondary":      "#___",
      "--color-accent":         "#___",
      "--color-text-primary":   "#___",
      "--color-text-secondary": "#___",
      "--color-text-muted":     "#___",
      "--color-border":         "#___",
      "--color-border-subtle":  "#___"
    },
    "semantic": {
      "--color-success":   "#___",
      "--color-error":     "#___",
      "--color-warning":   "#___",
      "--color-info":      "#___"
    },
    "gradients": {
      "--gradient-primary":  "linear-gradient(...)",
      "--gradient-surface":  "linear-gradient(...)",
      "--gradient-accent":   "linear-gradient(...)"
    },
    "shadows": {
      "--shadow-sm":    "...",
      "--shadow-md":    "...",
      "--shadow-lg":    "...",
      "--shadow-glow":  "..."
    },
    "surface": {
      "treatment": "grain | glass | gradient-mesh | flat | textured",
      "grainOpacity": 0.03,
      "blurStrength": "12px"
    },
    "contrastCheck": {
      "textOnBg":      "passes AA (ratio: X.X:1)",
      "textOnSurface": "passes AA (ratio: X.X:1)",
      "accentOnBg":    "passes AA (ratio: X.X:1)"
    }
  }
}
```

**Rules:**
- Both dark and light palettes must feel intentional — not auto-inverted
- All text-on-background pairs must pass WCAG 2.1 AA (4.5:1 normal text, 3:1 large text)
- Shadows must match the mood (dark editorial = no/subtle shadows, glass = colored shadows)
- Surface treatment is decided by `textureProfile` from designDNA

---

## Phase 3b — Typewolf + Google Fonts Typography (Browser)

**Objective:** Find the fonts that real award-winning designers are using right now — then implement with Google Fonts for zero-cost delivery.

### Primary Path — Browse Typewolf

Use your browser tool to research fonts on Typewolf. You are reading the page visually.

**Steps:**

1. **Browse the category page** — Navigate to:
   ```
   https://www.typewolf.com/{typewolfCategory}
   ```
   Using the `typewolfCategory` from `designDNA` (e.g., `serif-fonts`, `geometric-sans-serif-fonts`).

2. **Read the font recommendations** — Typewolf lists fonts with:
   - Font name and foundry
   - Example sites using the font
   - Font personality descriptions
   - Whether it's available on Google Fonts or Adobe Fonts

   Record the top 8–10 fonts from this page.

3. **Check the Site of the Day** — Navigate to:
   ```
   https://www.typewolf.com/site-of-the-day
   ```
   Note which fonts the current featured sites are using — this is the freshest trend signal.

4. **Check Typewolf's font pairing recommendations** — Navigate to:
   ```
   https://www.typewolf.com/google-fonts
   ```
   This page specifically lists the best Google Fonts with professional pairings. Cross-reference
   fonts found in steps 1-3 with their Google Fonts equivalents.

5. **Also browse Typewolf's "Top 40" lists** — If time allows:
   ```
   https://www.typewolf.com/top-40
   ```
   These are Typewolf's curated best fonts across categories.

### Google Fonts Implementation

For every font Typewolf recommends that isn't free, find the closest Google Fonts equivalent:

| Typewolf Discovery (Premium) | Google Fonts Equivalent | Why It Works |
|---|---|---|
| Canela (Commercial Type) | Playfair Display or Instrument Serif | Same warm editorial serif energy |
| Söhne (Klim) | DM Sans or Plus Jakarta Sans | Same neutral-but-characterful sans |
| GT Sectra | Cormorant Garamond or Fraunces | Similar oldstyle contrast + ink traps |
| Neue Haas Grotesk | Outfit or Space Grotesk | Geometric neo-grotesque family |
| Pangram Pangram Editorial New | Instrument Serif | Extreme weight contrast display serif |
| GT America | Urbanist or Figtree | Versatile geometric sans |
| Suisse Int'l | Manrope | Geometric with humanist touches |
| Druk | Syne | Bold display/impact font |

**The ideal pairing uses Typewolf discovery for inspiration but Google Fonts for implementation.**

### Fallback — AI Knowledge (if browser unavailable)

If you cannot access Typewolf via browser:
- Use the typography schools listed below to select fonts
- Cross-reference with your training knowledge of font pairings used on awarded sites

**Typography schools reference:**
- **Serif editorial** → Playfair Display, Instrument Serif, Cormorant Garamond, Fraunces, Lora
- **Neo-grotesque** → Outfit, Space Grotesk, Plus Jakarta Sans
- **Geometric** → DM Sans, Manrope, Urbanist, Figtree
- **Humanist** → Source Sans 3, Nunito Sans, Fira Sans
- **Display/experimental** → Syne, Space Mono, Unbounded
- **Slab** → Roboto Slab, Zilla Slab, Arvo
- **Monospace accent** → JetBrains Mono, Fira Code, IBM Plex Mono, Space Mono

### Forbidden Display Fonts
Never select these as the primary/display font:
- Inter, Roboto, Arial, Helvetica Neue, Open Sans, Lato, Montserrat, Poppins
- These are acceptable as **body** fonts ONLY when paired with a distinctive display typeface

### Selection Process

Select exactly 3 fonts:
1. **Display** — high personality, for hero text + section headings
2. **Body** — high readability, for paragraphs + UI text
3. **Accent** — optional, for captions, labels, code, or pull quotes

Validate against these rules:
- Display and body must have visible contrast (serif + sans, or different sans families)
- Weight contrast ratio ≥ 5:1 between heaviest display and regular body
- All 3 fonts must be on Google Fonts (zero-cost, zero-licensing-risk)
- x-height compatibility between body and display for visual harmony

### Output: `typography`
```json
{
  "typography": {
    "source": "typewolf-browser | ai-knowledge",
    "typewolfDiscoveries": [
      {
        "fontName": "font discovered on Typewolf",
        "foundry": "type foundry",
        "seenOn": "site name where it was used",
        "googleEquivalent": "Google Fonts match",
        "matchQuality": "exact | close | inspired-by"
      }
    ],
    "display": {
      "family":       "'Font Name', fallback-stack",
      "weights":      [300, 400, 700, 900],
      "usage":        "hero headings, section titles, impact text",
      "typewolfInspiration": "which Typewolf discovery inspired this pick",
      "reasoning":    "why this font matches the mood"
    },
    "body": {
      "family":       "'Font Name', fallback-stack",
      "weights":      [400, 500, 600],
      "usage":        "paragraphs, UI labels, navigation",
      "reasoning":    "why this font pairs well"
    },
    "accent": {
      "family":       "'Font Name', fallback-stack",
      "weights":      [400, 700],
      "usage":        "captions, metadata, code blocks, pull quotes",
      "reasoning":    "what role this plays"
    },
    "googleFontsUrl": "https://fonts.googleapis.com/css2?family=...",
    "cssVariables": {
      "--font-display": "'...', ..., serif",
      "--font-body":    "'...', ..., sans-serif",
      "--font-accent":  "'...', ..., monospace"
    },
    "scale": {
      "--text-xs":    "clamp(0.75rem, 0.7rem + 0.25vw, 0.8125rem)",
      "--text-sm":    "clamp(0.8125rem, 0.75rem + 0.3vw, 0.9375rem)",
      "--text-base":  "clamp(1rem, 0.925rem + 0.375vw, 1.125rem)",
      "--text-lg":    "clamp(1.125rem, 1rem + 0.5vw, 1.375rem)",
      "--text-xl":    "clamp(1.375rem, 1.1rem + 1vw, 1.875rem)",
      "--text-2xl":   "clamp(1.75rem, 1.3rem + 1.5vw, 2.5rem)",
      "--text-3xl":   "clamp(2.25rem, 1.5rem + 2.5vw, 3.5rem)",
      "--text-4xl":   "clamp(2.75rem, 1.5rem + 4vw, 5rem)",
      "--text-hero":  "clamp(3.5rem, 2rem + 5vw, 7rem)"
    },
    "lineHeight": {
      "--leading-tight":   "1.1",
      "--leading-snug":    "1.3",
      "--leading-normal":  "1.5",
      "--leading-relaxed": "1.7"
    },
    "letterSpacing": {
      "--tracking-tight":    "-0.02em",
      "--tracking-normal":   "0",
      "--tracking-wide":     "0.05em",
      "--tracking-widest":   "0.1em"
    },
    "measure": {
      "--measure-narrow": "45ch",
      "--measure-normal": "65ch",
      "--measure-wide":   "80ch"
    },
    "pairingRationale": "why these fonts work together as a system"
  }
}
```

---

## Phase 3c — Mobbin UX Flow Research (MobbinAPI)

**Objective:** Reference real production app flows and UI patterns — so interaction design is grounded in what actually works, not theoretical patterns.

### Primary Path — MobbinAPI

**Source:** [github.com/underthestars-zhy/MobbinAPI](https://github.com/underthestars-zhy/MobbinAPI)

Mobbin's internal API is accessible via their Supabase endpoints. The MobbinAPI library wraps these. Here's how to use it:

#### Setup (One-Time)

**Credentials needed:**
```env
MOBBIN_EMAIL=your@email.com    # Free Mobbin account (sign up at mobbin.com)
```

**Authentication flow:**
```javascript
// 1. Send OTP login email
const SUPABASE_URL = "https://api.mobbin.com";

await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: MOBBIN_EMAIL, type: "magiclink" })
});
// → User checks email, gets OTP code

// 2. Verify OTP (one-time — saves tokens for 30 days)
const authRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: MOBBIN_EMAIL, token: OTP_CODE, type: "magiclink" })
});
const { access_token, refresh_token } = await authRes.json();

// 3. Save tokens to .env.local for reuse
// MOBBIN_ACCESS_TOKEN=<access_token>
// MOBBIN_REFRESH_TOKEN=<refresh_token>
// MOBBIN_TOKEN_TIME=<Date.now()>

// 4. Refresh token if > 23 hours old
const refreshRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ refresh_token: MOBBIN_REFRESH_TOKEN })
});
const newTokens = await refreshRes.json();
```

#### Querying Mobbin

Once authenticated:

```javascript
const MOBBIN_API = "https://mobbin.com/api";
const headers = { Authorization: `Bearer ${access_token}` };

// 1. Get apps by category (uses mobbinCategory from designDNA)
const apps = await fetch(
  `${MOBBIN_API}/apps?platform=web&category=${encodeURIComponent(mobbinCategory)}&page=1`,
  { headers }
).then(r => r.json());

// 2. Get a Mobbin query token (needed for some endpoints)
const { token: mobbinToken } = await fetch(
  `${MOBBIN_API}/token`, { headers }
).then(r => r.json());

// 3. Get flows for a specific app
const flows = await fetch(
  `${MOBBIN_API}/apps/${appId}/flows`,
  { headers: { ...headers, "x-mobbin-token": mobbinToken } }
).then(r => r.json());

// 4. Get screens with UI pattern tags
const screens = await fetch(
  `${MOBBIN_API}/apps/${appId}/screens?patterns=true`,
  { headers }
).then(r => r.json());
```

#### What to Extract from Mobbin

For the top 3–5 apps in the `mobbinCategory`:
1. **User flows** — The step-by-step screens of key journeys (onboarding, checkout, search, etc.)
2. **UI patterns** — Tagged patterns on individual screens (how headers behave, card layouts, CTAs)
3. **Interaction models** — How the app handles navigation, transitions, loading states

### Fallback Path 1 — Browser (if no MobbinAPI credentials)

Browse Mobbin directly:

1. Navigate to:
   ```
   https://mobbin.com/browse/web-apps?category={mobbinCategory}
   ```

2. Visually scan the listed apps. For each relevant app:
   - Note the app name and what category it belongs to
   - Look at the preview screens — identify UI patterns visible

3. Click into the top 3–5 apps and browse their flows:
   ```
   https://mobbin.com/apps/{appName}/flows
   ```
   Record the flow names, number of screens, and visible patterns.

4. Click into individual screens and note:
   - Navigation pattern (sticky, shrinking, tabbed, etc.)
   - Content layout (cards, lists, grids, editorial blocks)
   - CTA placement and style
   - Loading/empty state treatments

### Fallback Path 2 — AI Knowledge (if no browser access either)

If neither MobbinAPI nor browser is available, use your training knowledge:
- Reference specific well-known apps in the category
- Describe their known UX flows and patterns
- Map patterns to the design DNA's mood and interaction style

### Output: `mobbinResearch`
```json
{
  "mobbinResearch": {
    "source": "mobbin-api | mobbin-browser | ai-knowledge",
    "category": "from designDNA.mobbinCategory",
    "appsResearched": [
      {
        "name": "App Name",
        "category": "category",
        "keyFlows": [
          {
            "name": "Landing → Product → Checkout",
            "screenCount": 6,
            "patterns": ["scroll-storytelling", "persistent-cart", "product-zoom"]
          }
        ]
      }
    ],
    "discoveredPatterns": [
      {
        "pattern": "pattern-name",
        "seenIn": ["App 1", "App 2"],
        "description": "how it works",
        "relevance": "why it fits this design DNA"
      }
    ],
    "selectedPatterns": ["pattern-1", "pattern-2", "...up to 10"],
    "avoidPatterns": ["anti-pattern-1", "..."],
    "interactionModel": {
      "personality":     "description of the interaction feel",
      "scrollBehavior":  "smooth | snap | parallax | natural",
      "pageTransition":  "crossfade | slide | morph | none",
      "cursorBehavior": {
        "default":      "standard system cursor",
        "interactive":  "pointer with optional scale transform",
        "custom":       "only if mood demands it — must respect prefers-reduced-motion",
        "a11yNote":     "custom cursor never replaces system semantics"
      },
      "entranceSequence": {
        "description": "what happens when the page first loads",
        "steps": [
          { "element": "nav",       "animation": "fade-down",   "delay": "0ms",   "duration": "400ms" },
          { "element": "hero-text", "animation": "clip-reveal",  "delay": "200ms", "duration": "600ms" },
          { "element": "hero-image","animation": "scale-in",     "delay": "400ms", "duration": "800ms" }
        ]
      },
      "hoverStates": {
        "buttons":  "scale(1.02) + shadow elevation",
        "cards":    "translateY(-4px) + shadow-lg",
        "links":    "underline-slide or color-shift",
        "images":   "scale(1.05) with overflow:hidden crop"
      }
    }
  }
}
```

### UI Pattern Vocabulary

When selecting patterns, choose from this vocabulary:

**Layout Patterns:**
```
sticky-shrinking-header       — nav shrinks on scroll, doesn't hide
full-bleed-section-break      — edge-to-edge image/color between content blocks
bento-grid                    — irregular grid layout (inspired by Apple)
split-screen-hero             — 50/50 image+text hero
asymmetric-content-blocks     — intentionally off-center compositions
horizontal-scroll-section     — lateral scrolling for galleries/portfolios
overlapping-elements          — intentional z-index layering
```

**Motion Patterns:**
```
scroll-triggered-reveal       — elements animate in as they enter viewport
staggered-entrance            — children animate in sequence (80ms delay)
parallax-depth-layers         — foreground/background move at different speeds
magnetic-hover                — elements subtly pull toward cursor on hover
text-split-animation          — characters/words animate individually
smooth-page-transition        — crossfade or slide between pages
progress-scroll-indicator     — shows reading/scroll progress
```

**Interactive Patterns:**
```
hover-card-lift               — cards elevate + shadow on hover
image-reveal-on-hover         — image visible only on hover (editorial style)
cursor-context-change         — cursor shape/text changes on different zones
accordion-progressive         — expand/collapse for progressive disclosure
filter-with-animation         — filtered items animate layout shift (FLIP)
toast-notifications           — non-blocking feedback messages
skeleton-loading              — gray shapes before content loads
```

**Always Avoid:**
```
✗ hamburger-on-desktop         — hides navigation, reduces discoverability
✗ icon-only-nav-no-labels      — forces recall over recognition
✗ modal-popup-on-entry         — 95% user annoyance rate
✗ infinite-scroll-no-reference — users lose position, can't share location
✗ autoplay-video-with-sound    — immediate bounce trigger
✗ carousel-as-only-content     — users interact with first slide only
✗ placeholder-as-label         — disappears on focus, WCAG failure
✗ scroll-hijacking             — breaks expected scroll behavior
✗ mystery-meat-navigation      — cryptic labels/icons without clear meaning
```

---

## Phase 3d — Usability Science (Non-Negotiable Rules)

**Objective:** Validate every design decision against established usability research. These are not suggestions — they are constraints. They come from Nielsen Norman Group's published research and established UX principles.

### The 10 Usability Heuristics — Encoded as Build Rules

Every component you build MUST satisfy these. Score each 1–10 during Phase 5 validation.

---

#### H1 — Visibility of System Status
```
REQUIRED:
✓ Every interactive element has visible hover + active + focus states
✓ Loading: use skeleton screens (not spinners) for async content
✓ Form submission shows clear progress → success → error feedback
✓ Navigation active state is visually distinct in 3+ dimensions (color + weight + indicator)
✓ Scroll progress indicator on long-form content pages
```

#### H2 — Match System to Real World
```
REQUIRED:
✓ Copy in user's language — no technical jargon without explanation
✓ Icons follow established conventions (no creative substitutions for ≡ ✕ ← → ↑ 🔍)
✓ Date/price/phone formats match expected locale
✓ Error messages in plain language: "Email must include @" not "ERR_VALIDATION_REGEX"
```

#### H3 — User Control and Freedom
```
REQUIRED:
✓ Every modal/overlay has a visible close button AND closes on Escape key
✓ Destructive actions (delete, unsubscribe) require confirmation
✓ Breadcrumbs on pages > 2 levels deep
✓ Back navigation never traps user in a dead end
✓ Undo available for reversible actions (e.g., "Removed — Undo")
```

#### H4 — Consistency and Standards
```
REQUIRED:
✓ Design tokens enforce uniformity — same component = same behavior everywhere
✓ Button hierarchy: primary > secondary > ghost — never inverted on a page
✓ Link colors consistent and distinguishable from body text
✓ Spacing follows an 8px base grid (4, 8, 12, 16, 24, 32, 48, 64, 96, 128)
✓ All icons from the same family/style — never mix filled + outlined
```

#### H5 — Error Prevention
```
REQUIRED:
✓ Inline form validation on blur (not on submit, not on every keystroke)
✓ Irreversible actions have a confirmation step with clear consequences stated
✓ Smart defaults pre-fill known values (country from IP, timezone, etc.)
✓ Dangerous actions (delete, cancel subscription) visually de-emphasized (ghost/text, not primary)
```

#### H6 — Recognition Over Recall
```
REQUIRED:
✓ Navigation uses text labels — never icon-only for primary nav
✓ Search includes autocomplete or recent suggestions
✓ Filters/selections remain visible after being applied
✓ Persistent navigation keeps context across page changes
```

#### H7 — Flexibility and Efficiency
```
REQUIRED:
✓ Full keyboard navigation across entire site
✓ Skip-to-content link as first focusable element (visually hidden until focused)
✓ Search accessible from every page
✓ Responsive — designed for mobile first, enhanced for desktop
```

#### H8 — Aesthetic and Minimalist Design
```
REQUIRED:
✓ Every visual element earns its place — if removing it improves clarity, remove it
✓ No decorative-only animation — all motion serves a purpose (guide attention, show state, feedback)
✓ Information hierarchy clear in first 3 seconds without reading
✓ Max 3 levels of visual emphasis per viewport — more = noise
✓ Mobile views are purpose-built, not scaled-down desktop
```

#### H9 — Help Users Recover From Errors
```
REQUIRED:
✓ Error messages: name the problem + explain why + give next step
✓ 404 page includes search + navigation back to main sections
✓ Form errors highlight the specific failing field with inline message
✓ No raw error codes ever visible to end users
```

#### H10 — Help and Documentation
```
REQUIRED:
✓ Complex features have contextual tooltips (not help pages)
✓ Onboarding present for features with learning curve
✓ Contact/support reachable within 2 clicks from any page
✓ FAQ or help accessible from footer
```

---

### Per-Component Research Rules (Hard Requirements)

#### Navigation
```
✓ Maximum 7 primary nav items — beyond 7, users miss items
✓ Labels: 1–2 words, noun-based ("Products" not "Explore Our Products")
✓ Active state distinct in 3+ ways (color + font-weight + indicator element)
✓ Desktop: always expanded/visible — never hamburger above 768px
✓ Mobile: bottom tab bar for 3–5 destinations (most thumb-reachable)
✓ Sticky header that shrinks on scroll — never fully hides (reduces orientation)
```

#### Typography & Readability
```
✓ Body text minimum: 16px (1rem) — smaller causes measurable reading speed drops
✓ Optimal line length: 50–75 characters per line (use max-width: 65ch on paragraphs)
✓ Line height: 1.4–1.6 for body, 1.1–1.3 for display headings
✓ Paragraphs: max 4–5 lines before a visual break
✓ Body text: left-aligned — center-align only for headings ≤ 5 words
✓ Font loading: use font-display: swap to prevent invisible text (FOIT)
```

#### CTAs (Calls to Action)
```
✓ Primary CTA: most visually prominent element per section
✓ Copy: action verb first — "Book a Demo", "Start Free Trial", not "Learn More"
✓ Maximum 2 competing CTAs per viewport
✓ Placement: above the fold AND after value proposition
✓ Minimum size: 44×44px (WCAG 2.5.5) — 48×48px recommended for touch
✓ Ghost/outline buttons: secondary actions only — never primary CTA
```

#### Forms
```
✓ Single-column layout (faster completion than multi-column)
✓ Labels always above fields — never floating inside, never beside
✓ Placeholder text ≠ label — placeholders are for examples ("john@email.com")
✓ Inline validation: show on blur, not on keystroke
✓ Error messages: specific and next to the field — never just top-of-form summary
✓ Required vs optional: mark the minority (if most required, label optional ones)
✓ Progress indicator: required for flows > 3 steps
✓ Autofocus first field on page load
```

#### Mobile
```
✓ Primary actions in thumb zone (bottom 40% of screen)
✓ Touch targets: 44px minimum, 8px gap between adjacent targets
✓ Bottom nav for 3–5 primary destinations
✓ Input type attributes: email, tel, number — trigger correct keyboard
✓ Skeleton screens for loading (not spinners)
✓ Tap-to-expand preferred over horizontal scroll for hidden content
```

#### Cognitive Load
```
✓ Progressive disclosure: surface 20% of features by default, reveal on demand
✓ Max 7 items per group (cards, nav items, filter options)
✓ Generous whitespace around content blocks improves comprehension
✓ Max 3 levels of visual emphasis per page
✓ Related items grouped visually — users expect same treatment for same appearance
```

#### Trust & Credibility
```
✓ Contact information visible in footer
✓ Social proof (testimonials, logos, stats) above the fold on landing pages
✓ About page: one of the most-visited trust pages — never skip it
✓ Privacy policy link in footer
✓ Author attribution + date on articles/blog content
```

#### Accessibility (WCAG 2.1 AA — Minimum Standard)
```
✓ Color contrast: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold)
✓ Focus indicators: 3:1 contrast ratio, never remove outline without replacement
✓ Full keyboard operability — Tab, Enter, Escape, Arrow keys
✓ Skip-to-main-content as first focusable element on every page
✓ Images: alt text for informational, alt="" for decorative
✓ prefers-reduced-motion: disable all non-essential animations
✓ prefers-color-scheme: respect system dark/light preference
✓ Every form input has a programmatic <label> — not just visual text
✓ Focus trap inside modals — Tab never escapes to background content
✓ Announce dynamic content changes with aria-live regions
```

### Conflict Resolution: Mobbin vs NNG

When Mobbin research suggests a pattern that conflicts with usability heuristics, **NNG wins.**
Beauty without usability fails.

| Mobbin Pattern | Research Finding | Resolution |
|---|---|---|
| Icon-only nav on mobile | Reduces discoverability ~40% | Add text labels below icons |
| Full-screen video autoplay | Increases bounce rate | Muted autoplay + visible pause control |
| Infinite scroll | Users lose position reference | Add pagination or scroll position indicator |
| Modal newsletter popup | Overwhelming majority find it annoying | Inline signup or exit-intent |
| Horizontal scroll card row | Fails discoverability | Add scroll indicators + peek of next item |
| Hamburger menu on desktop | Hides navigation options | Expanded nav above 768px breakpoint |

---

## Phase 4 — Synthesis

**Objective:** Combine all Phase 3 research into two canonical files.

### Output File 1: `design-system.json`

Single source of truth for how things **look**.

```json
{
  "meta": {
    "generatedAt":  "ISO timestamp",
    "mood":         "from designDNA",
    "visualStyle":  "from designDNA",
    "defaultMode":  "dark | light",
    "version":      "1.0",
    "sources": {
      "aesthetics":  "pinterest-browser | ai-knowledge",
      "typography":  "typewolf-browser | ai-knowledge",
      "flows":       "mobbin-api | mobbin-browser | ai-knowledge",
      "usability":   "nng-heuristics"
    }
  },
  "colorSystem":  "/* from Phase 3a — full dual-mode palette */",
  "typography":   "/* from Phase 3b — Typewolf-inspired, Google Fonts implemented */",
  "spacing": {
    "base": "8px",
    "scale": {
      "--space-1":  "0.25rem",
      "--space-2":  "0.5rem",
      "--space-3":  "0.75rem",
      "--space-4":  "1rem",
      "--space-6":  "1.5rem",
      "--space-8":  "2rem",
      "--space-12": "3rem",
      "--space-16": "4rem",
      "--space-24": "6rem",
      "--space-32": "8rem"
    },
    "sectionPadding": {
      "mobile":  "var(--space-16)",
      "tablet":  "var(--space-24)",
      "desktop": "var(--space-32)"
    },
    "containerWidth": {
      "sm":    "640px",
      "md":    "768px",
      "lg":    "1024px",
      "xl":    "1280px",
      "2xl":   "1400px"
    }
  },
  "layout": {
    "grid": {
      "columns":  12,
      "gutter":   "var(--space-6)",
      "margin":   "var(--space-4)"
    },
    "breakpoints": {
      "--bp-sm":  "375px",
      "--bp-md":  "768px",
      "--bp-lg":  "1024px",
      "--bp-xl":  "1440px",
      "--bp-2xl": "1920px"
    }
  },
  "motion": {
    "easing": {
      "--ease-out":     "cubic-bezier(0.16, 1, 0.3, 1)",
      "--ease-in":      "cubic-bezier(0.4, 0, 1, 1)",
      "--ease-in-out":  "cubic-bezier(0.65, 0, 0.35, 1)",
      "--ease-spring":  "cubic-bezier(0.34, 1.56, 0.64, 1)",
      "--ease-smooth":  "cubic-bezier(0.25, 0.1, 0.25, 1)"
    },
    "duration": {
      "--duration-instant":   "100ms",
      "--duration-fast":      "200ms",
      "--duration-normal":    "350ms",
      "--duration-slow":      "500ms",
      "--duration-dramatic":  "800ms",
      "--duration-cinematic": "1200ms"
    },
    "scrollReveal": {
      "distance":      "20px",
      "staggerDelay":  "80ms",
      "threshold":     0.15
    },
    "reducedMotion": {
      "strategy":          "remove-non-essential",
      "keepTransitions":   ["opacity", "color", "background-color"],
      "removeTransitions": ["transform", "clip-path", "filter"]
    }
  },
  "borders": {
    "--radius-sm":    "4px",
    "--radius-md":    "8px",
    "--radius-lg":    "12px",
    "--radius-xl":    "16px",
    "--radius-2xl":   "24px",
    "--radius-full":  "9999px",
    "--border-width": "1px"
  },
  "zIndex": {
    "--z-base":       1,
    "--z-dropdown":   100,
    "--z-sticky":     200,
    "--z-overlay":    300,
    "--z-modal":      400,
    "--z-toast":      500
  }
}
```

### Output File 2: `ux-spec.json`

Single source of truth for how things **behave**.

```json
{
  "meta": {
    "generatedAt": "ISO timestamp",
    "version":     "1.0"
  },
  "interactionModel":    "/* from Phase 3c — Mobbin-informed */",
  "heuristicCompliance": {
    "overall": 0,
    "scores": [
      { "id": 1, "name": "Visibility of System Status", "score": 0, "notes": "" }
    ]
  },
  "componentRules": {
    "navigation": "/* from Phase 3d */",
    "forms":      {},
    "cta":        {},
    "mobile":     {},
    "typography": {},
    "trust":      {},
    "a11y":       {}
  },
  "mobbinFlows":       "/* key flows discovered from Mobbin research */",
  "conflictsResolved": "/* Mobbin vs NNG conflicts and how they were resolved */",
  "performanceBudget": {
    "LCP":  "≤ 2.5s",
    "FID":  "≤ 100ms",
    "CLS":  "≤ 0.1",
    "TTFB": "≤ 800ms",
    "totalBundleJS":   "≤ 200KB gzipped",
    "totalBundleCSS":  "≤ 50KB gzipped",
    "totalFontWeight": "≤ 150KB",
    "heroImageWeight": "≤ 200KB (WebP/AVIF)"
  }
}
```

---

## Phase 5 — Quality Gate (Every Item Checked)

### ❌ Forbidden Patterns (Auto-Reject — If Present, Redesign)

If any of these appear in your design, you have produced generic AI output. Go back and fix.

```
TYPOGRAPHY:
  ✗ Inter/Roboto/Poppins/Montserrat/Open Sans/Lato used as BOTH display AND body
  ✗ Default browser font stack with no custom fonts loaded
  ✗ All text the same weight (no weight contrast in hierarchy)

COLOR:
  ✗ Generic blue (#007bff) + white background (Bootstrap default)
  ✗ Generic purple-to-blue gradient on white (AI default #1)
  ✗ Pure black (#000000) text on pure white (#FFFFFF) background
  ✗ Neon accent color that fails contrast checks

LAYOUT:
  ✗ "3 cards in a row" features section with icon + heading + paragraph
  ✗ Centered hero with stock illustration + headline + CTA + scroll arrow
  ✗ Cookie-cutter: hero → features → testimonials → pricing → CTA → footer
  ✗ Everything centered, everything same width, no spatial tension

COMPONENTS:
  ✗ Bootstrap/default border-radius: 6px buttons with no hover state
  ✗ Hamburger menu visible on desktop (above 768px)
  ✗ Modal popup on page load (newsletter, cookie wall, promotion)
  ✗ Placeholder text used as form label
  ✗ "Learn More" as primary CTA
  ✗ Infinite scroll with no position reference

IMAGES:
  ✗ Undraw/Storyset/LottieFiles illustrations as primary hero visual
  ✗ Generic stock photos (handshake, diverse team at whiteboard)
  ✗ Placeholder gray boxes with "Image" text

COPY:
  ✗ "Powerful", "Seamless", "Revolutionary", "Transform your..."
  ✗ "We leverage cutting-edge technology to deliver innovative solutions"
  ✗ Lorem ipsum in any shipped component

MOTION:
  ✗ Fade-in-up on scroll applied uniformly to every single element
  ✗ Bounce animation on buttons
  ✗ 3+ second loading animation before content appears
```

### ✅ Awwwards Quality Markers (All Must Be Present)

```
TYPOGRAPHY:
  ✓ Weight contrast ratio ≥ 5:1 between heaviest display and regular body
  ✓ Display font has visible personality — not a workhorse UI font
  ✓ Typographic scale uses clamp() for fluid sizing

LAYOUT:
  ✓ At least 1 grid-breaking or asymmetric element per above-fold section
  ✓ Intentional whitespace — generous, not cramped
  ✓ Visual rhythm — alternating section densities (dense → airy → dense)

MOTION:
  ✓ Page entrance: one orchestrated, staggered reveal sequence
  ✓ Scroll-triggered reveals with stagger delays between siblings
  ✓ Hover states on ALL interactive elements (buttons, cards, links, images)
  ✓ Nav transforms on scroll (shrink, blur background, change color)
  ✓ prefers-reduced-motion fully respected

SURFACES:
  ✓ At least 1 surface treatment beyond flat color (grain, glass, gradient, texture)
  ✓ Shadows match the mood (no generic box-shadow on a dark editorial design)

STATES:
  ✓ Loading state designed (skeleton screens)
  ✓ Error state designed (not browser defaults)
  ✓ Empty state designed (not "No results found." in plain text)
  ✓ 404 page is designed, not a white page with "Not Found"

RESPONSIVE:
  ✓ Mobile layout is a purposeful redesign, not just a single-column squish
  ✓ Touch targets ≥ 44px on mobile
  ✓ Typography scales fluidly with clamp()

DETAIL:
  ✓ Micro-interactions on form inputs (focus ring animation, input validation)
  ✓ Smooth transitions between all state changes (never instant/jarring)
  ✓ Favicon and page title set (not "React App" or "Next.js")
  ✓ Meta description written for SEO
```

### 🧪 Heuristic Score Gate

Run a self-evaluation against all 10 heuristics from Phase 3d. Each must score ≥ 7/10.
If any heuristic scores below 7, the specific failing components must be revised before build.

---

## Phase 6 — User Review

Present the complete design system to the user for approval:

1. **Research summary** — What you found on Pinterest, Typewolf, and Mobbin
2. **Color palette** — Show both light and dark mode palettes with labeled swatches
3. **Typography** — Show the font pairing with sample text at key sizes. Mention the Typewolf inspiration.
4. **Interaction patterns** — List selected Mobbin-informed patterns with brief explanations
5. **Heuristic scores** — Show the 10-heuristic evaluation with any concerns flagged
6. **Component preview** — Describe what key components (nav, hero, cards, footer) will look like

Ask: *"Does this design direction look right? Any adjustments before I start building?"*

**Only proceed to build after explicit user approval.**

---

## Phase 7 — Build (Implementation Rules)

Once approved, build the website following these rules:

### CSS Architecture
```css
/* 1. Load design tokens as CSS custom properties */
:root {
  /* paste all tokens from design-system.json as --var-name: value */
}

/* 2. Dark mode via class toggle AND system preference */
@media (prefers-color-scheme: dark) {
  :root:not(.light-mode) {
    /* dark mode token overrides */
  }
}
.dark-mode {
  /* dark mode token overrides (manual toggle) */
}

/* 3. Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* 4. Fluid type — never use fixed px for font-size */
h1 { font-size: var(--text-hero); }
p  { font-size: var(--text-base); }

/* 5. Container — never wider than max */
.container {
  width: 100%;
  max-width: var(--container-xl);
  margin-inline: auto;
  padding-inline: var(--space-4);
}
```

### Component Rules
- Every component reads from design tokens — **no hardcoded colors, sizes, or fonts**
- Every interactive element has `:hover`, `:focus-visible`, `:active` states
- Every button has `cursor: pointer` and minimum 44×44px hit area
- Every image uses `loading="lazy"` except hero/above-fold images
- Every image has `alt` text (informational) or `alt=""` (decorative)
- Every form input has an associated `<label>` element
- Every page has a unique `<title>` and `<meta name="description">`
- No `!important` except in the reduced-motion media query

### Performance Rules
- Fonts: preload the primary display weight, `font-display: swap` for all
- Images: WebP/AVIF format, srcset for responsive sizes, explicit width/height
- JS: no render-blocking scripts, defer/async all non-critical JS
- CSS: inline critical CSS for above-fold content if possible
- Limit third-party scripts — each one costs LCP

### File Naming
```
design-system.json      — visual tokens (generated by this pipeline)
ux-spec.json            — behavioral rules (generated by this pipeline)
```

---

## Quick Reference — The Pipeline Checklist

Use this to track completion of each phase:

```
[ ] Phase 1 — Image analyzed, designDNA extracted
[ ] Phase 2 — User confirmed designDNA
[ ] Phase 3a — Pinterest browsed, palette validated, dual-mode colors defined
[ ] Phase 3b — Typewolf browsed, fonts discovered, Google Fonts implementation ready
[ ] Phase 3c — Mobbin researched, interaction patterns selected, entrance sequence defined
[ ] Phase 3d — All 10 heuristics applied, per-component rules loaded, conflicts resolved
[ ] Phase 4 — design-system.json + ux-spec.json synthesized
[ ] Phase 5 — Quality gate passed (0 forbidden patterns, all Awwwards markers present)
[ ] Phase 6 — User approved final design system
[ ] Phase 7 — Website built using approved tokens
```

---

## Research Source Priority

For every design decision, prefer real-world research over AI knowledge:

```
PRIORITY 1 (best):  Live browser research — Pinterest, Typewolf, Mobbin
PRIORITY 2 (good):  MobbinAPI data — structured, from production apps
PRIORITY 3 (ok):    AI training knowledge — frozen in time, but comprehensive
PRIORITY 4 (last):  Generic rules — only if all above fail
```

Always note which source informed each decision in the output JSONs.

---

> **Remember:** You are not generating a "nice enough" website.
> You are producing work that would survive review by a creative director,
> pass a Nielsen Norman Group audit, and compete on Awwwards.
> Generic output is failure. Distinctive, research-grounded output is the standard.
