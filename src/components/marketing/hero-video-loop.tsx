"use client";

import { useEffect, useRef } from "react";

const HERO_VIDEOS = [
  "/marketing/hero/adeco-construction.mp4",
  "/marketing/hero/hvac-tech.mp4",
  "/marketing/hero/carpenter-workshop.mp4",
  "/marketing/hero/plumber-kitchen.mp4",
] as const;

export function HeroVideoLoop() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    indexRef.current = 0;

    const enableAutoplay = () => {
      video.muted = true;
      video.defaultMuted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
    };

    const playCurrent = () => {
      if (cancelled) return;
      enableAutoplay();
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          /* retry once the file is actually ready */
        });
      }
    };

    const showClip = (index: number) => {
      indexRef.current = index;
      const src = HERO_VIDEOS[index];
      if (!video.currentSrc.endsWith(src)) {
        video.src = src;
      }
      playCurrent();
    };

    const onEnded = () => {
      showClip((indexRef.current + 1) % HERO_VIDEOS.length);
    };

    const onError = () => {
      showClip((indexRef.current + 1) % HERO_VIDEOS.length);
    };

    enableAutoplay();
    video.src = HERO_VIDEOS[0];
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);
    video.addEventListener("canplay", playCurrent);
    video.addEventListener("loadeddata", playCurrent);
    playCurrent();

    const retry = window.setTimeout(playCurrent, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
      video.removeEventListener("canplay", playCurrent);
      video.removeEventListener("loadeddata", playCurrent);
      video.pause();
    };
  }, []);

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover object-center md:object-right scale-[1.04] mkt-hero-video-mask"
          src={HERO_VIDEOS[0]}
          muted
          playsInline
          autoPlay
          preload="auto"
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[1] mkt-hero-video-scrim-x"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] mkt-hero-video-scrim-y"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[var(--mkt-ink)]/55 md:bg-transparent"
        aria-hidden
      />
    </>
  );
}
