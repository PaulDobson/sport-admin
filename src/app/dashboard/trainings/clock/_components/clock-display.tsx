"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Maximize2, Minimize2 } from "lucide-react";

const BG_IMAGES = [
  "/timers/entrenamiento_g_1.jpg",
  "/timers/entrenamiento_g_3.jpg",
  "/timers/entrenamiento_g_4.jpg",
  "/timers/entrenamiento_g_5.jpg",
  "/timers/clock_1.jpg",
  "/timers/clock_2.jpg",
  "/timers/clock_3.jpg",
  "/timers/clock_4.jpg",
  "/timers/clock_5.jpg",
  "/timers/clock_6.jpg",
  "/timers/clock_7.jpg",
  "/timers/clock_8.jpg",
];

const IMAGE_ROTATE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Returns the image index for the current 10-minute wall-clock slot.
 * Slot boundaries align with real clock time (00:00, 00:10, 00:20…)
 * rather than drifting from when the component mounted.
 */
function currentImageIndex(): number {
  const d = new Date();
  const slot = d.getHours() * 6 + Math.floor(d.getMinutes() / 10);
  return slot % BG_IMAGES.length;
}

/**
 * Milliseconds until the next 10-minute boundary.
 * Used to align the first rotation with the wall clock.
 */
function msUntilNextSlot(): number {
  const now = new Date();
  const msIntoSlot =
    (now.getMinutes() % 10) * 60_000 +
    now.getSeconds() * 1000 +
    now.getMilliseconds();
  return IMAGE_ROTATE_MS - msIntoSlot;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

interface ClockDisplayProps {
  gymName: string;
}

export function ClockDisplay({ gymName }: ClockDisplayProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [imgIndex, setImgIndex] = useState<number>(currentImageIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Per-second clock tick — lightweight, only updates `now`
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Image rotation — aligned to wall-clock 10-minute boundaries.
  // A timeout fires at the next boundary, then a regular interval takes over.
  // Both are cleared on unmount → no memory leaks.
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const timeoutId = setTimeout(() => {
      setImgIndex(currentImageIndex());
      intervalId = setInterval(
        () => setImgIndex(currentImageIndex()),
        IMAGE_ROTATE_MS,
      );
    }, msUntilNextSlot());

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  // Sync fullscreen state with the browser Fullscreen API
  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const timeString = now.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const dateString = DATE_FORMATTER.format(now);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-[calc(100dvh-8rem)] w-full select-none flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black"
    >
      {/* Background image */}
      <Image
        src={BG_IMAGES[imgIndex]}
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="pointer-events-none object-cover opacity-40 mix-blend-luminosity"
      />

      {/* Dark gradient overlay for contrast */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/70 via-black/50 to-black/80"
      />

      {/* Fullscreen button — only visible before entering fullscreen */}
      {!isFullscreen ? (
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="Pantalla completa"
          className="animate-neon-cyan absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-xl border border-[rgba(0,255,200,0.45)] bg-black/50 px-4 py-2.5 text-sm font-bold text-[#00ffc8] backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00ffc8]"
        >
          <Maximize2 aria-hidden="true" className="h-5 w-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="Salir de pantalla completa"
          className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/50 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Minimize2 aria-hidden="true" className="h-5 w-5" />
        </button>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        {/* Academy name */}
        <div className="flex flex-col items-center gap-3">
          <p className="animate-gym-name text-lg font-black uppercase tracking-[0.22em] text-white sm:text-2xl">
            {gymName}
          </p>
          <span
            aria-hidden="true"
            className="block h-px w-16 rounded-full bg-white/20"
          />
        </div>

        {/* Time */}
        <time
          dateTime={now.toISOString()}
          suppressHydrationWarning
          className="font-mono text-[clamp(4rem,18vw,11rem)] font-bold leading-none tracking-tight text-white drop-shadow-[0_4px_32px_rgba(0,0,0,0.8)]"
          aria-live="off"
          aria-atomic="true"
        >
          {timeString}
        </time>

        {/* Date */}
        <p
          suppressHydrationWarning
          className="text-xl font-semibold capitalize text-white/75 sm:text-2xl"
        >
          {dateString}
        </p>
      </div>
    </div>
  );
}
