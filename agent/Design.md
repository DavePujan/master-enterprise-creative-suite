# Design System & UI/UX Guidelines
## Project: Writopedia AI (Master Enterprise Creative Suite)

---

### 1. Visual Philosophy & Aesthetic
Writopedia AI follows an **Ultra-Premium Enterprise Studio Aesthetic**:
- **Clean Architectural Precision**: Sharp, minimal radius borders (`rounded-sm`, `rounded-xs`) resembling modern CAD and high-end creative suite tools (Figma, Linear, Ableton).
- **Subtle Depth & Glassmorphism**: Translucent panels with background blurs (`backdrop-blur-md`), subtle single-pixel border definitions (`border-slate-200 dark:border-slate-800`), and delicate drop shadows.
- **Dynamic Brand Theming**: The interface dynamically absorbs the active brand's color palette, applying brand primary, secondary, and accent colors to headings, borders, and button highlights.

---

### 2. Typography & Fonts

#### Font Stack (Loaded via Google Fonts in `src/index.css`):
1. **Primary UI & Headings**: `"Outfit"`, sans-serif (Weights: 300, 400, 500, 600, 700)
   - Modern, geometric, clean geometric kerning.
2. **Body & Neutral Content**: `"Inter"`, sans-serif (Weights: 300, 400, 500, 600)
   - High legibility across all display scales.
3. **Editorial & High-Fashion Accents**: `"Playfair Display"`, serif / `"Cormorant Garamond"`
   - Used for editorial brand narratives, luxury campaign headlines, and book titles.
4. **Technical & Digital Accents**: `"Space Grotesk"`, sans-serif
   - Used for campaign tags, engine badges, and model identifiers.
5. **Code & Telemetry**: `"JetBrains Mono"`, monospace
   - Used for audio timing counters, coordinate inputs, and token usage meters.

---

### 3. Color Palette & Token Hierarchy

#### Primary Neutral Scale:
- **Light Theme**:
  - Background Canvas: `#ffffff`
  - Surface Cards / Panels: `#f8fafc` / `#f1f5f9` (`slate-50` / `slate-100`)
  - Borders: `#e2e8f0` (`slate-200`)
  - Primary Text: `#020617` (`slate-950`)
  - Secondary Text: `#475569` (`slate-600`)
- **Dark Theme**:
  - Background Canvas: `#020617` (`slate-950`)
  - Surface Cards / Panels: `#0f172a` (`slate-900`)
  - Borders: `#1e293b` (`slate-800`)
  - Primary Text: `#f8fafc` (`slate-50`)
  - Secondary Text: `#94a3b8` (`slate-400`)

#### Brand Accent & Crimson Palette:
The suite features a signature high-energy Crimson/Rose accent:
```css
--color-crimson: #dd1a46;
--color-rose-50: #fdf2f4;
--color-rose-100: #fce4e8;
--color-rose-400: #ee5b75;
--color-rose-500: #e52c4d;
--color-rose-600: #dd1a46;
--color-rose-700: #ba1235;
--color-rose-950: #490412;
```

#### Status Indicators:
- **Active / Success**: `emerald-600` / `emerald-400`
- **Warning / Sub-optimal Reference**: `amber-600` / `amber-400`
- **Error / Quota Exhaustion**: `rose-600` / `rose-400`

---

### 4. Layout & UI Patterns

#### 4.1 Toolbar & Parameter Controls
- Compact horizontal parameter bars with high-contrast active states (`bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100`).
- Model Support Indicators: Minimal status line showing real-time feature compatibility for the active model (Logo Overlay, Face Reference, Product Placement, Ingredients Input).

#### 4.2 Interactive Canvas
- **Viewport Container**: Padded stage with subtle dark/light contrast background, allowing mouse and touch interactions.
- **Repositionable Elements**: Bounding boxes with dashed rose guides on hover, grab cursors (`cursor-grab` / `cursor-grabbing`), and inline floating tooltips ("Drag directly to reposition").
- **Property Inspector**: Compact side panel for granular slider-based coordinate offsets, text scale percentage, and palette swatches.

#### 4.3 Motion & Transitions
- Micro-animations powered by `motion`:
  - Modals and toolbars: Fade-in and subtle slide from top (`fade-in slide-in-from-top-1`).
  - Progress loaders: Shimmer effects (`.animate-shimmer` with linear gradient translation).
  - Audio waveform and progress bars: Smooth linear transitions.
