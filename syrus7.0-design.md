# Syrus 7.0 — Star Wars theme

Design reference for the Syrus page (`/syrus`). Everything here lives in
`src/pages/Syrus` and `src/components/SyrusComponents`; no other page is
affected. All theme tokens are scoped under `.syrus-page`.

**Concept:** the visitor enters the Star Wars universe. A quiet opening card,
a scroll-driven opening crawl, a jump to hyperspace, then a minimal hero. The
rest of the page is a dark flight-deck UI (chamfered panels, hologram-cyan
data, crawl-yellow headings) over one continuous starfield.

No Lucasfilm logos, stills, audio or video are used. The "opening crawl" and
"hyperspace" are generated in code.

---

## 1. Fonts

Files live in `src/assets/fonts/syrus/` and are imported in
`src/pages/Syrus/Syrus.css` with `@font-face`.

| Role | Family | CSS variable | Used for |
| --- | --- | --- | --- |
| Primary | Star Jedi | `--syrus-font-primary` | **Only** the "Syrus 7.0" title (hero) and the SYRUS wordmark in the navbar / menu |
| Secondary | Star Jedi Hollow | `--syrus-font-secondary` | Section titles (`sponsors`, `timeline`, `tracks`, `faqs`, `gallery`) and the Call A Mentor title |
| Text | Oxanium | `--syrus-font-text` | Everything else |

Rules:

- Star Jedi fonts render lowercase letters as capitals. **Write those titles in
  lowercase** and do not add `text-transform: uppercase` (it makes some
  letters, e.g. `U`, render wrongly).
- Star Jedi has no `₹` or arrow glyphs. Use Oxanium for `₹` and SVG for arrows.
- Oxanium is a variable font (200–800), split into `latin` and `latin-ext`
  files with `unicode-range`, so only the needed file is downloaded.

---

## 2. Colour tokens

Defined at the top of `Syrus.css`. Never hard-code hex values in components.

| Token | Value | Use |
| --- | --- | --- |
| `--syrus-void` | `#04050a` | Page background |
| `--syrus-hull` | `#0b0d12` | Section base |
| `--syrus-plate` | `#12151b` | Panels, cards |
| `--syrus-plate-2` | `#1a1e26` | Raised panels, inputs |
| `--syrus-seam` | `#2a2f39` | 1px borders |
| `--syrus-bone` | `#e8e2d0` | Body text |
| `--syrus-dim` | `#8b8f98` | Secondary text |
| `--syrus-white` | `#ffffff` | Sponsor circles |
| `--syrus-yellow` | `#ffe81f` | Signature crawl yellow: titles, primary button, active states |
| `--syrus-amber` | `#e9a415` | Hover / pressed yellow |
| `--syrus-holo` | `#5fd4f0` | Hologram cyan: data, labels, focus ring |
| `--syrus-rebel` | `#ff6b1a` | Highlight / notes |
| `--syrus-saber` | `#e3262e` | Errors |

`--syrus-*-rgb` triplets exist for `void`, `bone`, `yellow`, `holo` and
`rebel` so you can write `rgba(var(--syrus-holo-rgb), 0.4)`.

Layout tokens: `--syrus-nav-h` (60px), `--syrus-container` (1240px),
`--syrus-gutter` (content side padding), `--syrus-section-y`.
Navbar tokens: `--syrus-nav-gutter` (`clamp(12px, 2.4vw, 32px)`) and
`--syrus-nav-max` (1680px). The navbar uses these instead of the content
gutter/container, so the bar always sits **wider than the page content**
(edge-to-edge on phones, up to 1680px on large screens).
Motion tokens: `--syrus-ease-scan`, `--syrus-ease-jump`.

---

## 3. Page flow

1. **Intro** (`Intro`): tall scroll track (430svh) with a pinned 100svh stage.
   Scroll progress is smoothed (exponential lerp) and drives everything:
   *prologue* ("A long time ago in a galaxy far, far away....") → *title
   recedes* → *perspective crawl* → *hyperspace jump* (star streaks + flash) →
   *hero arrives*. It is not a video and not time-based; the visitor controls
   it. A "Skip intro" button jumps to the hero.
2. **Hero** (`Hero`, lives inside the intro stage as the last frame): CodeCell++
   and VESIT logos, "Syrus 7.0" in the primary font, "9th – 10th October",
   then Register + Join Group. Nothing else.
3. **Sponsors** → **Prize pool** → **Timeline** → **Tracks** → **FAQs** →
   **Gallery** → **Footer**.

Background: one fixed `Starfield` canvas behind the whole page (twinkling
stars, cross-shaped glints, an occasional shooting star, and the hyperspace
streaks). The hyperspace streaks are driven by the shared `starState.warp`
value that `Intro` writes.

### Navbar
- Hidden until the **Sponsors** section scrolls into view, then slides down:
  SYRUS wordmark (left, primary font), Register + Join Group (right). Its
  horizontal padding is `--syrus-nav-gutter`, smaller than the content gutter,
  so it spans more of the screen than the sections below it.
- The **Menu** button (top-right) appears as soon as the hero is reached and
  stays through the page. It opens a full-screen menu (Sponsors, Prize Pool,
  Timeline, Tracks, FAQs, Gallery). `Esc` closes it; focus is managed.

### Sponsors
All logos are **circles**. A tier with no logo yet shows an empty white circle.
Edit the `TIERS` array at the top of `Sponsors.jsx`: set `logo: "/sponsors/x.webp"`
to fill one in.

### Timeline
A **starship that builds itself** as you scroll. There are 10 stops and 10 3D
models (`public/spaceship-3d-models/dread_step01…10_*.glb`, one per stop,
about 7.5 MB in total). Stop *n* always shows model *n*.

Layout: a tall scroll track holds a sticky stage with two panels.
- **Viewer panel**: the 3D ship on a faint hologram base, a caption
  ("Build 05 / 10 · Superstructure"), a "Drag to rotate" hint, and a **stop rail**
  of 10 numbered dots (done = cyan, current = yellow). Clicking a dot jumps there.
- **Card**: phase chip, "Stop 05 / 10", date/time, title, description and
  Prev / Next.
- Phones and tablets stack viewer over card; screens ≥ 960px (and short
  landscape phones) put them side by side.

Behaviour:
- The active stop comes from **native scroll progress**, with no scroll
  hijacking. Prev/Next, the rail and the arrow keys smooth-scroll to a stop.
- When the stop changes, the old model is cut away and the new one is revealed
  behind a moving cyan **scan plane** (about 1.1 s; reversed when going back).
  With `prefers-reduced-motion` it is an instant swap.
- The ship **auto-rotates slowly** and can be **rotated by hand** (mouse drag or
  touch). Auto-rotate pauses while you interact and resumes about 2 s later.
  Zoom and pan are off, and the canvas uses `touch-action: pan-y`, so a vertical
  swipe on a phone still scrolls the page.
- Camera distance is fitted to the model's bounding sphere and refitted on resize,
  so the ship is never cropped at any rotation angle.

Where things live:
| What | File |
| --- | --- |
| Stop data (date, title, description) | `src/assets/data/timelineEvents.js` |
| Stop → model mapping and captions | `src/assets/data/shipModels.js` (edit `file` / `label` per stop) |
| Layout and responsive rules | `Timeline/Timeline.module.css` |
| Scroll logic, rail, card | `Timeline/Timeline.jsx` |
| Viewer wrapper and overlays | `Timeline/ShipViewer.jsx` + `.module.css` |
| three.js scene (lights, controls, loader, transition) | `Timeline/shipScene.js` |

To swap or add a model, replace the file in `public/spaceship-3d-models/`. The
model count must equal the number of timeline events (10).

Keeping it light:
- The viewer is **lazy-loaded** (`React.lazy`) and only mounted when the section
  is within about 800px of the viewport. Only the current model and the next one
  are fetched.
- The render loop runs only while the viewer is on screen and the tab is visible.
- Device pixel ratio is capped at 1.75 (1.25 on low-end devices, where
  antialiasing is also off). Lighting is one environment map plus two lights; no
  shadows or post-processing.
- If WebGL is unavailable or a model fails to load, the viewer shows a short
  message (with a **Try again** button when it can help) and the timeline still
  works with the card and rail. The real error is logged to the browser console
  as `[Syrus ship] …`. A lost GPU context is given 4 s to restore itself first,
  and the GPU context is released on unmount so dev hot-reloads don't pile up.
- Heaviest files are steps 8–10 (about 4.8 MB together). If load time on slow
  networks matters, compress them with `gltf-transform` (meshopt/draco).

### Tracks
Five cards (Blockchain, FinTech, Agentic AI, Quantum, FE Special). Data:
`src/assets/data/tracks.js`. Each card has a **commented-out** "View Problem
Statements" button in `Tracks.jsx`; on hackathon day, uncomment it and fill in
`problemStatementsUrl` for each track.

### Call A Mentor
Logic is unchanged (`CallAMentor.jsx`); only `CallAMentor.module.css` was
restyled as a chamfered comm-panel.

---

## 4. Switches you will edit (`syrusConfig.js`)

| Export | Meaning |
| --- | --- |
| `PRIMARY_ACTION` | `"register"` (default) shows **Register** (with the Unstop icon). Set to `"mentor"` to show **Call a Mentor** instead, in both the hero and the navbar. |
| `REGISTER_URL` | `VITE_UNSTOP_REG_FORM_URL` from `.env`, falling back to `https://unstop.com` |
| `JOIN_GROUP_URL` | WhatsApp community link |
| `EVENT_DATES` | Date line in the hero |

`REDIRECT_TO_UNSTOP_FLAG` in `Syrus.jsx` (default `false`) sends everyone
straight to the registration page when set to `true`.

---

## 5. Shared UI pieces (`Syrus.css`)

- `.syrus-btn` + `--primary` (filled yellow) / `--ghost` (outlined): chamfered
  button, uppercase Oxanium, 50px tall.
- `.syrus-panel`: chamfered card with a 1px seam border. Override `--cut`,
  `--panel-bg`, `--panel-line` per card.
- `.syrus-container`, `.syrus-section`: page width and vertical rhythm.
- `[data-reveal]`: fades up once when scrolled into view (one shared
  `IntersectionObserver` in `Syrus.jsx`). Add `--reveal-delay` to stagger.
- `SectionHeading`: secondary-font title with a holo rule and corner ticks.

Specificity note: `.syrus-btn` rules are `.syrus-page .syrus-btn`. A component
that needs to change a button's size/position must out-rank them, e.g.
`:global(.syrus-page) button.myClass { … }` (see `Navbar.module.css`).

---

## 6. Performance & accessibility

- No video and no GSAP/Lenis/framer-motion on this page. three.js is used **only**
  by the lazy-loaded Timeline ship viewer (see Timeline). Scroll animation is
  plain `requestAnimationFrame`; the gallery uses CSS scroll-snap.
- Starfield: single 2D canvas, device pixel ratio capped at 1.5, pauses when the
  tab is hidden, fewer stars on low-end devices.
- `prefers-reduced-motion`: the starfield stays still, the intro applies its
  state without easing, reveals/transitions are off, and "Skip intro" is
  available.
- Touch targets ≥ 44px; visible focus ring (`--syrus-holo`); the menu is a
  labelled modal dialog; FAQ uses buttons with `aria-expanded`.
- Layout is fluid from 320px up: stacked timeline (viewer over card) and
  single-column tracks on phones; side-by-side timeline and 3 + 2 tracks grid on
  desktop. Checked at 360, 390, 768, 844×390 landscape, 1024, 1440 and 1920 wide
  with no horizontal overflow.

---

## 7. File map

```
src/
  assets/
    fonts/syrus/            StarJedi, StarJediHollow, Oxanium (latin, latin-ext)
    data/timelineEvents.js  Timeline events
    data/shipModels.js      Stop → starship model file + caption
    data/tracks.js          Track titles, sponsors, descriptions
  pages/Syrus/
    Syrus.jsx               Page assembly, reveal observer, mentor modal state
    Syrus.css               Fonts, tokens, base + shared utilities
  components/SyrusComponents/
    syrusConfig.js          Switches & links
    icons.jsx               Inline SVG icons
    Starfield/              Fixed space background + hyperspace streaks
    Intro/                  Scroll-driven prologue → crawl → warp
    Hero/                   Minimal hero
    ActionButtons/          Register / Call a Mentor + Join Group
    Navbar/                 Top bar, menu button, full-screen menu
    SectionHeading/         Secondary-font section title
    Timeline/               Timeline.jsx, ShipViewer.jsx, shipScene.js (three.js)
    Sponsors/  PrizePool/  Tracks/  Faq/  Gallery/
    SyrusFooter/  SyrusScrollToTop/  CallAMentor/
public/
  sponsors/                 Sponsor logos
  Gallery/                  Gallery photos (Syrus_24, Syrus_25)
  spaceship-3d-models/      10 build-step starship .glb files
  codecell-logo.webp  VESIT.png
```

Last year's GTA theme (fonts, plates, artwork), the old Star Wars 3D model and
`hyperspace.mp4` were removed.
