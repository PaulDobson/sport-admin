"use client";

/**
 * useStimulusSound
 *
 * Gestiona un AudioContext compartido y un AudioBuffer por cada sonido de
 * estímulo. Sigue exactamente el mismo patrón que useTimerSound:
 *
 * - Lazy AudioContext — creado en el primer preload(), dentro de un handler
 *   de gesto del usuario, para respetar las políticas de autoplay del navegador.
 * - Los buffers se cargan y decodifican UNA VEZ en preload() y se reusan.
 *   Preload recibe la lista exacta de paths que se necesitan para el ejercicio,
 *   evitando cargar los ~30 archivos si el instructor sólo seleccionó 3.
 * - Cada play() crea un AudioBufferSourceNode nuevo (uso único por spec).
 * - Errores silenciosos — el audio es un enhancement, nunca un bloqueante.
 * - El AudioContext se cierra en unmount.
 *
 * Optimización clave: buildStimulusSoundIndex() se llama en buildExecutionPlan,
 * antes del inicio del ejercicio, y devuelve un Map<stimulusId, AudioBuffer>
 * para lookup O(1) durante la ejecución. No hay fetch en caliente.
 */

import { useCallback, useEffect, useRef } from "react";

export interface UseStimulusSoundReturn {
  /**
   * Precarga exactamente los paths dados. Seguro llamar múltiples veces:
   * los paths ya cargados se saltean (idempotente).
   * Devuelve una Promise que resuelve cuando todos los buffers están listos.
   */
  preloadPaths: (paths: string[]) => Promise<void>;

  /**
   * Reproduce el buffer del path dado, si está precargado.
   * No-op silencioso si el buffer no existe todavía.
   */
  playPath: (path: string) => Promise<void>;

  /**
   * Devuelve el AudioBuffer del path si está cargado, null si no.
   * Útil para construir el mapa de ejecución fuera del hook.
   */
  getBuffer: (path: string) => AudioBuffer | null;
}

export function useStimulusSound(): UseStimulusSoundReturn {
  const ctxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const loadingRef = useRef<Set<string>>(new Set());

  // Cerrar el AudioContext al desmontar para liberar recursos de audio del SO
  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  /**
   * Inicializa el AudioContext si no existe (seguro dentro de handlers de usuario).
   *
   * Mobile fix: resume() is called and awaited synchronously here so that iOS
   * Safari sees both the context creation and the resume inside the same
   * user-gesture microtask frame.
   */
  const ensureContext = useCallback(async (): Promise<AudioContext> => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      await ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, []);

  const preloadPaths = useCallback(
    async (paths: string[]): Promise<void> => {
      const ctx = await ensureContext();

      // Solo cargar los paths que aún no están en caché ni en vuelo
      const pending = paths.filter(
        (p) => !buffersRef.current.has(p) && !loadingRef.current.has(p),
      );
      if (pending.length === 0) return;

      // Marcar como en vuelo antes del fetch para evitar cargas duplicadas
      // si preloadPaths se llama dos veces antes de que el fetch termine
      pending.forEach((p) => loadingRef.current.add(p));

      await Promise.all(
        pending.map(async (path) => {
          try {
            const res = await fetch(path);
            const arrayBuffer = await res.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            buffersRef.current.set(path, audioBuffer);
          } catch {
            // Fallo individual no bloquea los demás sonidos
          } finally {
            loadingRef.current.delete(path);
          }
        }),
      );
    },
    [ensureContext],
  );

  const playPath = useCallback(async (path: string) => {
    const ctx = ctxRef.current;
    const buffer = buffersRef.current.get(path);
    if (!ctx || !buffer) return;

    // Mobile fix: await resume() before start() so the context is actually
    // running when playback is attempted — fire-and-forget is not enough on iOS.
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        return;
      }
    }

    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      // AudioBufferSourceNode es de un solo uso — se auto-destruye tras la reproducción
    } catch {
      // Ignorar errores de playback
    }
  }, []);

  const getBuffer = useCallback((path: string): AudioBuffer | null => {
    return buffersRef.current.get(path) ?? null;
  }, []);

  return { preloadPaths, playPath, getBuffer };
}
