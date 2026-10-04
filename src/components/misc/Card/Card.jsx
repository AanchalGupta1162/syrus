import React from "react";
import "./Card.css";

// LinkedIn corner: an organic pixel decay (ragged edge, a few embers and stray
// dust) that spreads out from the bottom-right corner on hover. One pattern is
// generated once and shared by every card so the reveal feels consistent.
const DECAY_SEED = 7;
const GRID = 17; // cells per side
const CELL = 6; // px between cells (cells are 7px, so neighbours overlap and no seams show)

const buildDecay = (seed) => {
  const hash = (x, y, s) => {
    const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7 + seed * 19.31) * 43758.5453;
    return v - Math.floor(v);
  };
  // Smooth value noise so the edge wobbles instead of jittering cell by cell.
  const smooth = (x, y) => {
    const gx = x / 4;
    const gy = y / 4;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = hash(x0, y0, 1);
    const b = hash(x0 + 1, y0, 1);
    const c = hash(x0, y0 + 1, 1);
    const d = hash(x0 + 1, y0 + 1, 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };

  const radius = 11 + hash(3, 7, 9) * 1.6;
  const cells = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const dist = Math.hypot(x + 0.5, y + 0.5);
      const score = dist + (smooth(x, y) - 0.5) * 5.5 + (hash(x, y, 2) - 0.5) * 1.6;
      const j = hash(x, y, 3);
      let kind = null;
      if (dist < 8.6 || score < radius - 1.7) kind = "";
      else if (score < radius) kind = "edge";
      else if (score < radius + 1.2 && j > 0.55) kind = "ember";
      else if (score < radius + 3 && j > 0.86) kind = "dust";
      if (kind === null) continue;
      const late = kind === "ember" || kind === "dust" ? 60 : 0;
      cells.push({
        key: `${x}-${y}`,
        kind,
        style: {
          right: x * CELL,
          bottom: y * CELL,
          transitionDelay: `${Math.round(Math.max(0, score) * 16 + late)}ms`,
        },
      });
    }
  }
  return cells;
};

const DECAY_CELLS = buildDecay(DECAY_SEED);

// LinkedIn "in" badge on a 9x9 pixel grid.
const BADGE_PATH =
  "M1 0h7v1h-7zM0 1h9v1h-9zM0 2h2v1h-2zM3 2h6v1h-6zM0 3h9v1h-9zM0 4h2v1h-2zM3 4h1v1h-1zM7 4h2v1h-2zM0 5h2v1h-2zM3 5h1v1h-1zM5 5h2v1h-2zM8 5h1v1h-1zM0 6h2v1h-2zM3 6h1v1h-1zM5 6h2v1h-2zM8 6h1v1h-1zM0 7h2v1h-2zM3 7h1v1h-1zM5 7h2v1h-2zM8 7h1v1h-1zM1 8h7v1h-7z";

// The photo already carries the member's name and designation.
const Card = ({ card }) => (
  <article className="team-card">
    <div className="team-card-frame">
      <div className="team-card-inner">
        <div className="team-card-photo">
          <img src={card.photo} loading="lazy" alt={card.name} />
          <div className="team-card-scan" />
          {card.social && (
            <a
              className="team-card-corner"
              href={card.social}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${card.name}, ${card.designation}, on LinkedIn`}
            >
              {DECAY_CELLS.map((cell) => (
                <span
                  key={cell.key}
                  className={`team-card-px ${cell.kind}`}
                  style={cell.style}
                />
              ))}
              <svg className="team-card-badge" viewBox="0 0 9 9" aria-hidden="true">
                <path d={BADGE_PATH} />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  </article>
);

export default Card;
