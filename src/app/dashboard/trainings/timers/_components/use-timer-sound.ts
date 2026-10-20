"use client";

import { useCallback, useEffect, useRef } from "react";

// ─── Sound manifest ───────────────────────────────────────────────────────────

const SOUNDS = {
  beep: "/sounds/sonido_cuenta_regresiva.mp3",
  bell: "/sounds/campana.mp3",
  bellEnd: "/sounds/campana_fin.mp3",
  work: "/sounds/sonido_vamos.mp3",
  rest: "/sounds/sonido_descansa.mp3",
  done: "/sounds/sonido_tiempo.mp3",
  newSeries: "/sounds/sonido_nueva_serie.mp3",
} as const;

type SoundKey = keyof typeof SOUNDS;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages a shared AudioContext and a preloaded AudioBuffer per sound.
 *
 * Design decisions:
 *
 * 1. Web Audio API only — no external libraries. The API is available in all
 *    modern browsers and produces zero-latency playback once buffers are loaded.
 *
 * 2. Lazy AudioContext — created on the first call to `preload()`, not on
 *    mount. This respects browser autoplay policies: the context is created
 *    inside a user-gesture handler path (the "Iniciar" button triggers preload).
 *
 * 3. Buffers are fetched and decoded once, then reused for every play() call.
 *    Each play() creates a new AudioBufferSourceNode (they are single-use by
 *    design in the Web Audio API and are garbage-collected automatically after
 *    playback ends — no manual cleanup needed).
 *
 * 4. The AudioContext is closed on unmount to release system audio resources.
 *
 * 5. Errors are swallowed silently — audio is an enhancement, never a blocker.
 */
export function useTimerSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Partial<Record<SoundKey, AudioBuffer>>>({});
  const loadingRef = useRef(false);

  // Close the AudioContext on unmount to release OS audio resources
  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  /**
   * Creates the AudioContext and fetches + decodes all buffers in parallel.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  const preload = useCallback(async (): Promise<void> => {
    if (ctxRef.current || loadingRef.current) return;
    loadingRef.current = true;

    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;

      await Promise.all(
        (Object.entries(SOUNDS) as [SoundKey, string][]).map(
          async ([key, path]) => {
            try {
              const res = await fetch(path);
              const arrayBuffer = await res.arrayBuffer();
              const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
              buffersRef.current[key] = audioBuffer;
            } catch {
              // Individual file failures don't block other sounds
            }
          },
        ),
      );
    } catch {
      // AudioContext creation failed (e.g. blocked by browser policy)
    } finally {
      loadingRef.current = false;
    }
  }, []);

  /**
   * Plays a preloaded buffer.
   * Creates a fresh AudioBufferSourceNode each time — this is the correct
   * pattern for the Web Audio API. Nodes are single-use and GC'd automatically.
   */
  const play = useCallback((key: SoundKey) => {
    const ctx = ctxRef.current;
    const buffer = buffersRef.current[key];
    if (!ctx || !buffer) return;

    // Resume the context if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      // No need to store or stop the source — it self-disposes after playback
    } catch {
      // Ignore playback errors
    }
  }, []);

  // ── Semantic helpers ────────────────────────────────────────────────────────

  /** Countdown beep — for each second of the preparation phase and last 3s */
  const playBeep = useCallback(() => play("beep"), [play]);

  /** "¡Vamos!" + campana — played together when the work phase starts */
  const playWork = useCallback(() => {
    play("bell");
    play("work");
  }, [play]);

  /** "Descansa" + campana de fin — played together when the rest phase starts or timer ends */
  const playRest = useCallback(() => {
    play("bellEnd");
    play("rest");
  }, [play]);

  /** "Tiempo" + campana de fin — played together when the entire timer finishes */
  const playDone = useCallback(() => {
    play("bellEnd");
    play("done");
  }, [play]);

  /** "Nueva serie" — played during rest when 10 seconds remain */
  const playNewSeries = useCallback(() => play("newSeries"), [play]);

  return { preload, playBeep, playWork, playRest, playDone, playNewSeries };
}
