"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PREPARE_SECONDS = 5;

interface UsePrepareReturn {
  isPreparing: boolean;
  prepareSecondsLeft: number;
  /** Call when the user presses Iniciar. `onDone` fires when the 5s elapse. */
  startPrepare: (onDone: () => void) => void;
  /** Cancel an in-progress preparation (Detener during prepare phase). */
  cancelPrepare: () => void;
}

/**
 * Manages the 5-second "get ready" countdown before a timer starts.
 *
 * - Uses the same anchor-based technique (Date.now + offset) as the timers
 *   so it is drift-free.
 * - Cleans up its interval on unmount, no memory leaks.
 * - `onDone` is captured in a ref so callers don't need to worry about
 *   stale closures when passing the callback.
 */
export function usePrepare(): UsePrepareReturn {
  const [isPreparing, setIsPreparing] = useState(false);
  const [prepareSecondsLeft, setPrepareSecondsLeft] =
    useState(PREPARE_SECONDS);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number | null>(null);
  // Store the onDone callback in a ref to avoid stale closure issues
  const onDoneRef = useRef<(() => void) | null>(null);

  const clearTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => clearTick(), [clearTick]);

  const startPrepare = useCallback(
    (onDone: () => void) => {
      clearTick();
      onDoneRef.current = onDone;
      endTimeRef.current = Date.now() + PREPARE_SECONDS * 1000;
      setPrepareSecondsLeft(PREPARE_SECONDS);
      setIsPreparing(true);

      intervalRef.current = setInterval(() => {
        if (endTimeRef.current === null) return;
        const left = Math.round((endTimeRef.current - Date.now()) / 1000);

        if (left <= 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          endTimeRef.current = null;
          setPrepareSecondsLeft(0);
          setIsPreparing(false);
          // Fire the callback after state updates are scheduled
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
