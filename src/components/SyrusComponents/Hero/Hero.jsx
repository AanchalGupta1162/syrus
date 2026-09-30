import React, {
  Suspense,
  useEffect,
  useRef,
} from "react";

import { Canvas } from "@react-three/fiber";
import {
  Center,
  useGLTF,
} from "@react-three/drei";

import * as THREE from "three";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import styles from "./Hero.module.css";

gsap.registerPlugin(ScrollTrigger);


/* =========================================================
   ASSET PATHS
   ========================================================= */

const HERO_IMAGE =
  "/StarWars/jedi-sith.jpg";

const FALCON_MODEL =
  "/StarWars/millennium_falcon.glb";

const HYPERSPACE_VIDEO =
  "/StarWars/hyperspace.mp4";


/* =========================================================
   FALCON MODEL
   ========================================================= */

function FalconModel() {
  const { scene } = useGLTF(FALCON_MODEL);

  useEffect(() => {
    scene.traverse((object) => {
      if (!object.isMesh) return;

      object.castShadow = true;
      object.receiveShadow = true;

      /*
       * Smooth imported geometry.
       */
      if (object.geometry) {
        object.geometry.computeVertexNormals();
      }

      /*
       * Improve metallic hull appearance.
       */
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((material) => {
        if (!material) return;

        if ("flatShading" in material) {
          material.flatShading = false;
        }

        if ("roughness" in material) {
          material.roughness = 0.34;
        }

        if ("metalness" in material) {
          material.metalness = Math.min(
            Math.max(material.metalness ?? 0.35, 0.2),
            0.8
          );
        }

        material.needsUpdate = true;
      });
    });
  }, [scene]);

  return (
    <Center>
      <primitive
        object={scene}
        rotation={[0, Math.PI, 0]}
      />
    </Center>
  );
}

useGLTF.preload(FALCON_MODEL);


/* =========================================================
   THREE.JS FALCON SCENE
   ========================================================= */

function FalconScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{
        position: [0, 0.7, 10],
        fov: 32,
        near: 0.1,
        far: 100,
      }}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
    >
      <ambientLight intensity={1.1} />

      <directionalLight
        position={[5, 7, 8]}
        intensity={3.2}
      />

      <pointLight
        position={[-5, 2, 5]}
        intensity={2.4}
        distance={20}
        color="#6ea8ff"
      />

      <pointLight
        position={[5, -1, 2]}
        intensity={1.5}
        distance={18}
        color="#ffd6a0"
      />

      <directionalLight
        position={[0, 1, 10]}
        intensity={1.25}
      />

      <Suspense fallback={null}>
        <FalconModel />
      </Suspense>
    </Canvas>
  );
}


/* =========================================================
   HERO
   ========================================================= */

export default function Hero() {
  const sectionRef =
    useRef(null);

  const heroImageRef =
    useRef(null);

  const titleRef =
    useRef(null);

  const falconRef =
    useRef(null);

  const starfieldRef =
    useRef(null);

  const hyperspaceRef =
    useRef(null);

  const flashRef =
    useRef(null);


  useEffect(() => {
    const section =
      sectionRef.current;

    const heroImage =
      heroImageRef.current;

    const title =
      titleRef.current;

    const falcon =
      falconRef.current;

    const starfield =
      starfieldRef.current;

    const hyperspace =
      hyperspaceRef.current;

    const flash =
      flashRef.current;


    if (
      !section ||
      !heroImage ||
      !title ||
      !falcon ||
      !starfield ||
      !hyperspace ||
      !flash
    ) {
      return;
    }


    /* =====================================================
       LENIS
       ===================================================== */

    const lenis =
      new Lenis({
        smoothWheel: true,
        syncTouch: true,
      });


    const handleScroll =
      () => {
        ScrollTrigger.update();
      };


    lenis.on(
      "scroll",
      handleScroll
    );


    let rafId;


    const raf = (time) => {
      lenis.raf(time);

      rafId =
        requestAnimationFrame(raf);
    };


    rafId =
      requestAnimationFrame(raf);


    /* =====================================================
       INITIAL STATE
       ===================================================== */

    gsap.set(heroImage, {
      xPercent: -50,
      yPercent: -50,

      x: 0,
      y: 0,

      scale: 1,

      opacity: 1,

      filter:
        "blur(0px)",
    });


    /*
     * SYRUS title starts in the upper part
     * of the artwork.
     */
    gsap.set(title, {
      opacity: 1,

      y: 0,

      scale: 1,
    });


    /*
     * Falcon starts BELOW the title/artwork.
     */
    gsap.set(falcon, {
      xPercent: -50,
      yPercent: -50,

      x: 0,

      y: "40vh",

      scale: 0.42,

      rotation: 0,

      opacity: 0,

      transformOrigin:
        "50% 50%",
    });


    gsap.set(starfield, {
      scale: 1,
      opacity: 0.65,
    });


    gsap.set(hyperspace, {
      scale: 1,
      opacity: 0,
    });


    gsap.set(flash, {
      opacity: 0,
    });


    /* =====================================================
       MAIN SCROLL TIMELINE
       ===================================================== */

    const timeline =
      gsap.timeline({
        scrollTrigger: {
          trigger: section,

          start: "top top",

          end: "+=3400",

          scrub: 1.1,

          pin: true,

          anticipatePin: 1,

          invalidateOnRefresh: true,
        },
      });


    /* =====================================================
       PHASE 1
       SUBTLE INTRO
       ===================================================== */

    timeline.to(
      heroImage,
      {
        scale: 1.025,

        duration: 0.8,

        ease: "none",
      },
      0
    );


    timeline.to(
      title,
      {
        scale: 1.025,

        duration: 0.8,

        ease: "none",
      },
      0
    );


    /* =====================================================
       PHASE 2
       FALCON APPEARS
       ===================================================== */

    timeline.to(
      falcon,
      {
        opacity: 1,

        duration: 0.35,

        ease: "power2.out",
      },
      0.5
    );


    /* =====================================================
       PHASE 3
       FALCON RISES
       ===================================================== */

    timeline.to(
      falcon,
      {
        y: "18vh",

        scale: 0.62,

        duration: 1,

        ease: "power2.inOut",
      },
      0.7
    );


    timeline.to(
      falcon,
      {
        y: "0vh",

        scale: 0.92,

        duration: 1,

        ease: "power2.inOut",
      },
      1.7
    );


    /* =====================================================
       PHASE 4
       MAXIMUM VISIBLE SIZE
       ===================================================== */

    timeline.to(
      falcon,
      {
        scale: 1.05,

        duration: 0.45,

        ease: "power2.out",
      },
      2.7
    );


    /*
     * Brief visual hold.
     */
    timeline.to(
      falcon,
      {
        scale: 1.05,

        duration: 0.45,

        ease: "none",
      },
      3.15
    );


    /* =====================================================
       PHASE 5
       ARTWORK FADES INTO THE SPACE
       ===================================================== */

    timeline.to(
      heroImage,
      {
        opacity: 0.2,

        scale: 1.045,

        filter:
          "blur(3px)",

        duration: 0.7,

        ease: "power2.out",
      },
      2.75
    );


    timeline.to(
      title,
      {
        opacity: 0.15,

        scale: 1.04,

        duration: 0.7,

        ease: "power2.out",
      },
      2.75
    );


    /* =====================================================
       PHASE 6
       SPACE ACCELERATES
       ===================================================== */

    timeline.to(
      starfield,
      {
        scale: 2.5,

        opacity: 1,

        duration: 0.8,

        ease: "power2.in",
      },
      3.35
    );


    /* =====================================================
       PHASE 7
       FALCON RECEDES INTO DISTANCE
       ===================================================== */

    timeline.to(
      falcon,
      {
        y: "-3vh",

        scale: 0.78,

        duration: 0.55,

        ease: "power2.inOut",
      },
      3.7
    );


    timeline.to(
      falcon,
      {
        y: "-7vh",

        scale: 0.48,

        duration: 0.5,

        ease: "power3.in",
      },
      4.25
    );


    timeline.to(
      falcon,
      {
        y: "-10vh",

        scale: 0.12,

        opacity: 0,

        duration: 0.55,

        ease: "power4.in",
      },
      4.75
    );


    /* =====================================================
       PHASE 8
       HYPERSPACE
       ===================================================== */

    timeline.to(
      hyperspace,
      {
        opacity: 0.75,

        scale: 1.06,

        duration: 0.45,

        ease: "power2.in",
      },
      4.05
    );


    timeline.to(
      hyperspace,
      {
        opacity: 1,

        scale: 1.2,

        duration: 0.8,

        ease: "power3.in",
      },
      4.5
    );


    /* =====================================================
       PHASE 9
       FINAL FLASH
       ===================================================== */

    timeline.to(
      flash,
      {
        opacity: 0.95,

        duration: 0.15,

        ease: "power4.in",
      },
      5.05
    );


    timeline.to(
      flash,
      {
        opacity: 0,

        duration: 0.5,

        ease: "power2.out",
      },
      5.2
    );


    /* =====================================================
       CLEANUP
       ===================================================== */

    return () => {
      cancelAnimationFrame(
        rafId
      );

      lenis.off(
        "scroll",
        handleScroll
      );

      lenis.destroy();

      timeline.scrollTrigger?.kill();

      timeline.kill();
    };

  }, []);


  return (
    <section
      ref={sectionRef}
      className={styles.heroSection}
    >

      {/* =================================================
          BACKGROUND IMAGE
          ================================================= */}

      <div
        className={styles.imageBackdrop}
        aria-hidden="true"
      />

      <div
        ref={starfieldRef}
        className={styles.starfield}
        aria-hidden="true"
      />


      {/* =================================================
          MAIN IMAGE
          ================================================= */}

      <img
        ref={heroImageRef}
        className={styles.heroImage}
        src={HERO_IMAGE}
        alt="Jedi and Sith beneath a star-filled sky"
        draggable="false"
      />


      {/* =================================================
          SYRUS 7.0
          ================================================= */}

      <h1
        ref={titleRef}
        className={styles.syrusTitle}
      >
        SYRUS 7.0
      </h1>


      {/* =================================================
          HYPERSPACE VIDEO
          ================================================= */}

      <video
        ref={hyperspaceRef}
        className={styles.hyperspace}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source
          src={HYPERSPACE_VIDEO}
          type="video/mp4"
        />
      </video>


      {/* =================================================
          MILLENNIUM FALCON
          ================================================= */}

      <div
        ref={falconRef}
        className={styles.falcon}
        aria-hidden="true"
      >
        <FalconScene />
      </div>


      {/* =================================================
          VIGNETTE
          ================================================= */}

      <div
        className={styles.vignette}
        aria-hidden="true"
      />


      {/* =================================================
          FLASH
          ================================================= */}

      <div
        ref={flashRef}
        className={styles.flash}
        aria-hidden="true"
      />


      {/* =================================================
          SCROLL INDICATOR
          ================================================= */}

      <div
        className={styles.scrollHint}
      >
        <span>
          SCROLL TO ENTER HYPERSPACE
        </span>

        <div
          className={styles.scrollLine}
        />
      </div>

    </section>
  );
}