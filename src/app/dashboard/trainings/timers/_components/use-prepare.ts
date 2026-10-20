"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PREPARE_SECONDS = 3;

interface SoundApi {
  preload: () => Promise<void>;
  playBeep: () => void;
}

interface UsePrepareReturn {
  isPreparing: boolean;
  prepareSecondsLeft: number;
  startPrepare: (onDone: () => void) => void;
  cancelPrepare: () => void;
}

/**
 * Manages the 5-second "get ready" countdown before a timer starts.
 *
 * Receives the sound API from the caller so that both usePrepare and the
 * timer share the exact same AudioContext and buffer cache — a single
 * useTimerSound instance owns all audio state.
 */
export function usePrepare(sound: SoundApi): UsePrepareReturn {
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareSecondsLeft, setPrepareSecondsLeft] = useState(PREPARE_SECONDS);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const onDoneRef = useRef<(() => void) | null>(null);
  // Keep a stable ref to the sound API so the interval closure is always fresh.
  // The sound callbacks from useTimerSound are stable useCallback references,
  // so this effect almost never re-runs in practice.
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTick(), [clearTick]);

  const startPrepare = useCallback(
    (onDone: () => void) => {
      clearTick();
      onDoneRef.current = onDone;
      endTimeRef.current = Date.now() + PREPARE_SECONDS * 1000;
      setPrepareSecondsLeft(PREPARE_SECONDS);
      setIsPreparing(true);

      // Preload all buffers through the shared instance, then play the cue once
      soundRef.current.preload().then(() => soundRef.current.playBeep());

      intervalRef.current = setInterval(() => {
        if (endTimeRef.current === null) return;
        const left = Math.round((endTimeRef.current - Date.now()) / 1000);

        if (left <= 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          endTimeRef.current = null;
          setPrepareSecondsLeft(0);
          setIsPreparing(false);
          onDoneRef.current?.();
          onDoneRef.current = null;
        } else {
          setPrepareSecondsLeft(left);
        }
      }, 250);
    },
    [clearTick],
  );

  const cancelPrepare = useCallback(() => {
    clearTick();
    endTimeRef.current = null;
    onDoneRef.current = null;
    setPrepareSecondsLeft(PREPARE_SECONDS);
    setIsPreparing(false);
  }, [clearTick]);

  return { isPreparing, prepareSecondsLeft, startPrepare, cancelPrepare };
}
