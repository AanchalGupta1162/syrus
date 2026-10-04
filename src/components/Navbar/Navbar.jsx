import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./Navbar.css";
import CodecellLogo from "/codecell-logo.webp";

// Saber slash takes ~1.1s; ignore re-hovers while it is still playing.
const SABER_DURATION = 1200;

// "SYRUS 7.0" link: a lightsaber slash reveals the text on load and on hover.
// The label is drawn twice (top / bottom half) so it can split along the cut.
function SyrusLink({ className, onClick, children }) {
  const [phase, setPhase] = useState("play");
  const startedAt = useRef(Date.now());
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const replay = useCallback(() => {
    if (Date.now() - startedAt.current < SABER_DURATION) return;
    startedAt.current = Date.now();
    clearTimeout(timer.current);
    // Drop the animation for a frame so it restarts from the beginning.
    setPhase("hold");
    timer.current = setTimeout(() => setPhase("play"), 40);
  }, []);

  return (
    <a
      href="/syrus"
      className={`${className} syrus sx ${phase}`}
      onMouseEnter={replay}
      onFocus={replay}
      onClick={onClick}
    >
      <span className="sx-text">
        <span className="sx-label">
          <span className="sx-l sx-l1">SYRUS 7.0</span>
          <span className="sx-l sx-l2" aria-hidden="true">
            SYRUS 7.0
          </span>
        </span>
        <span className="sx-track" aria-hidden="true">
          <span className="sx-blade" />
        </span>
      </span>
      {children}
    </a>
  );
}

const MenuArrow = () => (
  <svg viewBox="0 0 5 5" aria-hidden="true">
    <path d="M0 0h1v5H0zM1 1h1v3H1zM2 2h1v1H2z" />
  </svg>
);

function CodecellNav({ isUpcomingWorkshops = false }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const links = [
    isUpcomingWorkshops && { href: "/#upcoming-events", label: "Upcoming" },
    { href: "/team", label: "Team" },
    { href: "/#events", label: "Events" },
    { href: "/#contact-us", label: "Contact" },
  ].filter(Boolean);

  const isActive = (href) => href === pathname;

  return (
    <header
      className={`cc-nav ${isUpcomingWorkshops ? "has-upcoming" : ""}`}
    >
      <nav className="cc-nav-wrap cc-navbar" aria-label="Main">
        <a href="/" className="cc-brand">
          <img src={CodecellLogo} alt="" />
          CodeCell++
        </a>

        <div className="cc-navlinks">
          <SyrusLink className="cc-navlink" />
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`cc-navlink ${isActive(link.href) ? "is-active" : ""}`}
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              {link.label}
            </a>
          ))}
        </div>

        <button
          type="button"
          className="cc-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <path d="M1 1h2v1h1v1h2V2h1V1h2v2H8v1H7v2h1v1h1v2H7V8H6V7H4v1H3v1H1V7h1V6h1V4H2V3H1z" />
            </svg>
          ) : (
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M1 2h10v2H1zM1 5h10v2H1zM1 8h10v2H1z" />
            </svg>
          )}
        </button>
      </nav>

      <div id="site-menu" className={`cc-mnav ${menuOpen ? "is-open" : ""}`}>
        <div className="cc-mnav-inner">
          <div className="cc-nav-wrap cc-mlinks">
            <SyrusLink className="cc-mlink sx-menu" onClick={closeMenu}>
              <MenuArrow />
            </SyrusLink>
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`cc-mlink ${isActive(link.href) ? "is-active" : ""}`}
                aria-current={isActive(link.href) ? "page" : undefined}
                onClick={closeMenu}
              >
                {link.label}
                <MenuArrow />
              </a>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

export default CodecellNav;
