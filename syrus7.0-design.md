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

1. **Intro** (`Intro`): tall scroll track (560svh) with a pinned 100svh stage.
   Scroll progress is smoothed (exponential lerp) and drives everything:
   *prologue* ("A long time ago in a galaxy far, far away....") → *title
   recedes* → *perspective crawl* → *hyperspace jump* (star streaks + flash) →
   *hero arrives*. It is not a video and not time-based; the visitor controls
   it. A "Skip intro" button jumps to the hero. The "SYRUS 7.0" title here is
   in the **secondary** font (Star Jedi Hollow, the yellow outline of the film
   opening). It opens exactly as wide as the screen, holds, then recedes slowly
   straight back into the distance: scale only, so it never drifts up or down
   (a steady, geometric shrink, softened by `FOLLOW_RATE`).
   Its timing is the `TITLE` block at the top of `Intro.jsx`. The hero title is
   the filled primary font.
   **Rapid wheel scrolling is slowed a little** (see below).
2. **Hero** (`Hero`, lives inside the intro stage as the last frame): CodeCell++
   and VESIT logos, "Syrus 7.0" in the primary font, "9th – 10th October",
   then Register + Join Group. Nothing else.
3. **Sponsors** → **Prize pool** → **Timeline** → **Tracks** → **FAQs** →
   **Gallery** → **Footer**.

Background: one fixed `Starfield` canvas behind the whole page (twinkling
stars, cross-shaped glints, an occasional shooting star, and the hyperspace
streaks). The hyperspace streaks are driven by the shared `starState.warp`
value that `Intro` writes.

#### Calmer wheel scrolling (`Intro/introWheelSmoother.js`)
A hard flick of the wheel or trackpad would rush through the whole intro in a
blink. While the page is inside the intro, the wheel is eased and, when it is
rapid, slowed down a little:

- **Normal scrolling** (up to about 1500 px/s) is followed 1:1; it only gets a soft
  ease so it glides.
- **Rapid scrolling** keeps only part of the extra distance. The share falls
  smoothly from 100 % at 1500 px/s to 45 % at 5000 px/s and above, so a hard flick
  travels about half as far and takes more than one flick to cross the intro.
- Nothing plays by itself: the page only ever moves in response to the wheel.
- Tuning constants are at the top of the file (`NORMAL_SPEED`, `RAPID_SPEED`,
  `RAPID_GAIN`, `EASE_RATE`).
- It only acts inside the intro. At the hero it hands over to native scrolling,
  and it steps aside when the page is scroll-locked (menu or modal open), when
  the wheel is over something with its own scrolling, and when anything else
  moves the page (keyboard, scrollbar, menu links, "Skip intro").
- Touch scrolling is left native. `prefers-reduced-motion` disables the smoother.
- The site sets `scroll-behavior: smooth` on `<html>`, so every frame is written
  with `behavior: "instant"`.
- The wheel listener is non-passive, so it is only attached while the page is
  within one screen of the intro.

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

Layout: a tall scroll track holds a sticky stage (heading + stage pinned under the nav).
- **Left / centre**: the starfield for the current galaxy, the 3D ship, and BB-8's
  **stop rail** of 10 numbered dots along the bottom (done = cyan, current = yellow).
  Clicking a dot jumps there.
- **Right: card column** showing exactly **three cards** at a time (previous, current,
  next). Each card has the phase, the date and time, the title and a short description.
  The centre card is the current one (yellow outline, full opacity); the cards above and
  below are dimmed (about 62%) and slightly smaller. The column glides with the scroll
  (an eased follower, so it never snaps), a thin indicator on its edge shows where you
  are among the 10, and clicking a card jumps to it.
- Screens below 900px (phones, small tablets) have **no 3D ship**: the galaxy glows
  above a taller card column, and the 3D viewer code and models are never downloaded
  there. Cards drop the top row and then the description if they get too short.

Behaviour:
- The active stop comes from **native scroll progress**, with no scroll
  hijacking. Prev/Next, the rail and the arrow keys smooth-scroll to a stop.
- When the stop changes, the old model is cut away and the new one is revealed
  behind a moving cyan **scan plane** (about 1.1 s; reversed when going back).
  With `prefers-reduced-motion` it is an instant swap.
- The ship **turns to face your cursor** (mouse only, no dragging): it pivots on the
  spot so its nose points at the pointer, easing between angles. When the cursor
  leaves the window, and on touch screens, it holds the heading of its flight to the
  next galaxy instead. Touch never fights page scrolling.
- Camera distance is fitted to the model's bounding sphere and refitted on resize,
  so the ship is never cropped at any rotation angle.

Where things live:
| What | File |
| --- | --- |
| Stop data (date, time, phase, title, description) | `src/assets/data/timelineEvents.js` |
| Stop → model mapping and captions | `src/assets/data/shipModels.js` (edit `file` / `label` per stop) |
| Layout and responsive rules | `Timeline/Timeline.module.css` |
| Scroll logic, rail, card column | `Timeline/Timeline.jsx` |
| Where the ship, star and card column sit (checked by `node scripts/check-placements.mjs`) | `Timeline/journey.js` |
| Viewer wrapper and overlays | `Timeline/ShipViewer.jsx` + `.module.css` |
| three.js scene (lights, controls, loader, transition) | `Timeline/shipScene.js` |

To swap or add a model, replace the file in `public/spaceship-3d-models/`. The
model count must equal the number of timeline events (10).

Keeping it light:
- **Galaxy backdrop** (`Timeline/Starfield.jsx`, screens 900px and wider): each galaxy
  (450 to 2,500 stars) is drawn once into an off-screen picture and then drawn with a
  single `drawImage` per frame, with the tilt / squash / spin applied as a canvas
  transform. Only the ~60 to 90 bright four-point glints are drawn live, so they still
  twinkle. It redraws at about 30 fps while a galaxy sits still (full rate while flying
  between stops).
- **Phones** (below 900px) have no galaxy canvas at all, just a still colour glow behind
  the cards (it was the main cause of lag on weaker phones). BB-8's always-on idle
  animations (head sway, antenna wiggle, lens glow) are off there too; he still rolls
  and hops. The card column restyles only the three visible cards while scrolling.
- **Page-wide starfield** (`Starfield/Starfield.jsx`): phones and low-end devices redraw
  it at about 30 fps and at 1x pixel density, and on phones it holds still while the
  Timeline is on screen. The intro's hyperspace streaks still get every frame.
- Phones also don't show the 3D ship, so the viewer code and models are never
  downloaded there.
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

### Gallery

- Photos live in `public/Gallery/Syrus_XX/` and are listed, **newest edition
  first** (26, 25, 24), in the `IMAGES` array at the top of `Gallery.jsx`.
  To add photos, drop the files in the folder and add their numbers to the
  matching `edition(year, [...])` line.
- Native CSS scroll-snap carousel. It **moves on one photo every 3 seconds**
  (`AUTOPLAY_MS`) and wraps back to the first photo after the last. It waits
  while a mouse is over the photos, a finger or the keyboard is on them, a
  photo is open, the section is off screen or the tab is hidden, and it is off
  entirely with `prefers-reduced-motion`. Using the arrows restarts the 3 s timer.
- Clicking a photo opens `GalleryLightbox.jsx`: a full-screen viewer portalled
  into `.syrus-page`. `Esc` / click outside closes, ← → or swipe moves
  (wrapping), focus goes in and returns to the photo, and page scroll is locked.
- The arrow buttons get their gap from `padding-top` on `.controls`, because
  `.syrus-page .syrus-container { margin: 0 auto }` overrides any `margin-top`.

### Force quote ("May the Force be with you")

`ForceQuote/` sits between **Tracks** and **FAQs**: a 230svh scroll track with a
sticky full-screen stage, driven by eased scroll progress like the intro.
It **overlaps its neighbours**: JS gives it a top margin of -50% of Tracks' height
and a bottom margin of -50% of the FAQ's height (`OVERLAP_TRACKS` / `OVERLAP_FAQ`), so it
starts when Tracks is 50% scrolled and is finished when 50% of the FAQ is in view.
A dark scrim fades in behind it so it reads over what is still on screen, and the
section ignores pointer events so nothing under it stops being clickable.

Sequence: a blade of light draws across the screen, splits open and reveals the
quote from the middle out, the six words land one by one ("force" in yellow), it
holds with a slow push-in and a swelling glow, then rushes toward the viewer into a
short hyperspace streak (`starState.warp`, peak `WARP_PEAK`) and gives way to the FAQ.
Only transform / opacity / clip-path animate. With `prefers-reduced-motion` it is a
plain block showing the finished quote (no overlap, no animation). To retime it,
edit the `seg(p, a, b)` ranges in `apply()`; to make it longer or shorter change
`.track` height in the CSS. The overlap is measured on load, resize and font load,
not when an FAQ item opens. `Intro.jsx` only writes `starState.warp` while its own
progress is below 1 so the two never fight.

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
- Layout is fluid from 320px up: stacked timeline (viewer over the cards) and
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
    Intro/                  Scroll-driven prologue → crawl → warp; introWheelSmoother.js (calmer wheel scrolling)
    Hero/                   Minimal hero
    ActionButtons/          Register / Call a Mentor + Join Group
    Navbar/                 Top bar, menu button, full-screen menu
    SectionHeading/         Secondary-font section title
    Timeline/               Timeline.jsx, ShipViewer.jsx, shipScene.js (three.js)
    Sponsors/  PrizePool/  Tracks/  Faq/
    ForceQuote/             Scroll-driven "May the Force be with you" moment
    Gallery/                Gallery.jsx (carousel + autoplay), GalleryLightbox.jsx (photo viewer)
    SyrusFooter/  SyrusScrollToTop/  CallAMentor/
public/
  sponsors/                 Sponsor logos
  Gallery/                  Gallery photos (Syrus_24, Syrus_25, Syrus_26)
  spaceship-3d-models/      10 build-step starship .glb files
  codecell-logo.webp  VESIT.png
```

Last year's GTA theme (fonts, plates, artwork), the old Star Wars 3D model and
`hyperspace.mp4` were removed.
