import { useEffect, useState } from "react";
import Starfield from "../../components/SyrusComponents/Starfield/Starfield";
import Intro from "../../components/SyrusComponents/Intro/Intro";
import Hero from "../../components/SyrusComponents/Hero/Hero";
import Navbar from "../../components/SyrusComponents/Navbar";
import Sponsors from "../../components/SyrusComponents/Sponsors/Sponsors";
import PrizePool from "../../components/SyrusComponents/PrizePool/PrizePool";
import Timeline from "../../components/SyrusComponents/Timeline/Timeline";
import Tracks from "../../components/SyrusComponents/Tracks/Tracks";
import ForceQuote from "../../components/SyrusComponents/ForceQuote/ForceQuote";
import Faq from "../../components/SyrusComponents/Faq/Faq";
import Gallery from "../../components/SyrusComponents/Gallery/Gallery";
import SyrusFooter from "../../components/SyrusComponents/SyrusFooter/SyrusFooter";
import SyrusScrollToTop from "../../components/SyrusComponents/SyrusScrollToTop/SyrusScrollToTop";
import CallAMentor from "../../components/SyrusComponents/CallAMentor/CallAMentor";
import { REGISTER_URL } from "../../components/SyrusComponents/syrusConfig";
import "./Syrus.css";

// Set to true to send every visitor straight to the Unstop registration page.
const REDIRECT_TO_UNSTOP_FLAG = false;

function Syrus() {
  const [mentorOpen, setMentorOpen] = useState(false);
  const openMentor = () => setMentorOpen(true);

  useEffect(() => {
    if (REDIRECT_TO_UNSTOP_FLAG) {
      window.location.href = REGISTER_URL;
    }
  }, []);

  // Reveal-on-scroll for every [data-reveal] element (one shared observer).
  useEffect(() => {
    const els = document.querySelectorAll(".syrus-page [data-reveal]");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="syrus-page">
      <Starfield />
      <Navbar onCallMentor={openMentor} />

      <main>
        <Intro>
          <Hero onCallMentor={openMentor} />
        </Intro>
        <Sponsors />
        <PrizePool />
        <Timeline />
        <Tracks />
        <ForceQuote />
        <Faq />
        <Gallery />
      </main>

      <SyrusFooter />
      <SyrusScrollToTop />
      <CallAMentor isOpen={mentorOpen} onClose={() => setMentorOpen(false)} />
    </div>
  );
}

export default Syrus;
