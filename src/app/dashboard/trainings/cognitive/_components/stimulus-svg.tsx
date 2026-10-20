/**
 * SVG stimulus renderers.
 *
 * Each component renders its stimulus as a square SVG viewport so it scales
 * cleanly at any CSS size via `width` / `height` on the parent container.
 *
 * Design decisions:
 * - Pure SVG (no canvas, no DOM text nodes) → layout-stable, fast, and
 *   accessible with aria-label.
 * - All components are memoised — the stimulus only changes at scheduled
 *   intervals (≥ 200 ms), not every animation frame.
 * - Colors use the hex value from the domain model directly so they are
 *   independent of the Tailwind build.
 * - Letter/number glyphs use a bold sans-serif that is universally available;
 *   no external font loading required.
 * - Arrow stimuli are pure SVG paths: a shaft (rectangle) + head (triangle).
 *   The viewBox is 200×200 and the arrow is drawn pointing right, then
 *   rotated via SVG transform for the other directions. This keeps all four
 *   arrows pixel-perfect identical in weight and proportions.
 */

import { memo } from "react";
import type {
  ArrowStimulus,
  ColorStimulus,
  LetterStimulus,
  NumberStimulus,
  SoundStimulus,
  Stimulus,
} from "@/domain/cognitive-training/cognitive-exercise";

// ─── Color circle ─────────────────────────────────────────────────────────────

export const ColorStimulusSVG = memo(function ColorStimulusSVG({
  stimulus,
  className,
}: {
  stimulus: ColorStimulus;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={stimulus.label}
      role="img"
      className={className}
    >
      <circle
        cx="100"
        cy="100"
        r="90"
        fill={stimulus.hex}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="4"
      />
    </svg>
  );
});

// ─── Letter glyph ─────────────────────────────────────────────────────────────

export const LetterStimulusSVG = memo(function LetterStimulusSVG({
  stimulus,
  className,
  color = "#ffffff",
}: {
  stimulus: LetterStimulus;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`Letra ${stimulus.label}`}
      role="img"
      className={className}
    >
      <text
        x="100"
        y="150"
        textAnchor="middle"
        fontFamily="'Manrope Variable', 'Manrope', system-ui, sans-serif"
        fontWeight="900"
        fontSize="160"
        fill={color}
      >
        {stimulus.glyph}
      </text>
    </svg>
  );
});

// ─── Number glyph ─────────────────────────────────────────────────────────────

export const NumberStimulusSVG = memo(function NumberStimulusSVG({
  stimulus,
  className,
  color = "#ffffff",
}: {
  stimulus: NumberStimulus;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`Número ${stimulus.label}`}
      role="img"
      className={className}
    >
      <text
        x="100"
        y="155"
        textAnchor="middle"
        fontFamily="'JetBrains Mono Variable', 'JetBrains Mono', monospace"
        fontWeight="800"
        fontSize="160"
        fill={color}
      >
        {stimulus.glyph}
      </text>
    </svg>
  );
});

// ─── Arrow stimulus ───────────────────────────────────────────────────────────
//
// The arrow is drawn inside a 200×200 viewBox pointing RIGHT, then rotated
// around the centre (100,100) for each direction. This guarantees all four
// arrows have identical proportions regardless of direction.
//
// Arrow anatomy (pointing right, centred in 200×200):
//
//          ┌──────────────────┐
//          │   shaft rect     │ ───►  arrowhead triangle
//          └──────────────────┘
//
//   Shaft:     y 78–122  (44px tall),  x 20–130
//   Arrowhead: points at (190,100), base corners at (120,50) and (120,150)
//
// The two shapes share the fill colour so they read as one unified arrow.

const ARROW_ROTATION: Record<ArrowStimulus["direction"], number> = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
  "up-right": 315,
  "up-left": 225,
  "down-right": 45,
  "down-left": 135,
};

export const ArrowStimulusSVG = memo(function ArrowStimulusSVG({
  stimulus,
  className,
  color = "#ffffff",
}: {
  stimulus: ArrowStimulus;
  className?: string;
  color?: string;
}) {
  const rotation = ARROW_ROTATION[stimulus.direction];

  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={stimulus.label}
      role="img"
      className={className}
    >
      <g
        transform={`rotate(${rotation}, 100, 100)`}
        fill={color}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        {/* Shaft — rectangle */}
        <rect x="18" y="78" width="112" height="44" rx="6" ry="6" />
        {/* Arrowhead — triangle */}
        <polygon points="118,42 190,100 118,158" />
      </g>
    </svg>
  );
});

// ─── Sound stimulus — nota musical SVG ───────────────────────────────────────
//
// Una corchea doble (♫) dibujada como paths SVG dentro del viewBox 200×200.
// Es reconocible de inmediato como "audio" y escala igual que los demás SVGs.

export const SoundStimulusSVG = memo(function SoundStimulusSVG({
  stimulus,
  className,
  color = "#ffffff",
}: {
  stimulus: SoundStimulus;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`Sonido: ${stimulus.label}`}
      role="img"
      className={className}
    >
      {/* Cabeza de la nota izquierda */}
      <ellipse
        cx="58"
        cy="148"
        rx="26"
        ry="18"
        transform="rotate(-18 58 148)"
        fill={color}
      />
      {/* Plica izquierda */}
      <rect x="79" y="55" width="9" height="97" rx="4" fill={color} />

      {/* Cabeza de la nota derecha */}
      <ellipse
        cx="122"
        cy="136"
        rx="26"
        ry="18"
        transform="rotate(-18 122 136)"
        fill={color}
      />
      {/* Plica derecha */}
      <rect x="143" y="43" width="9" height="97" rx="4" fill={color} />

      {/* Barra que une las dos plicas */}
      <rect x="79" y="55" width="73" height="10" rx="5" fill={color} />
      {/* Segunda barra */}
      <rect x="79" y="74" width="73" height="10" rx="5" fill={color} />
    </svg>
  );
});

// ─── Generic dispatcher ───────────────────────────────────────────────────────

/**
 * Renders the correct SVG for any stimulus type.
 * Used by both the selector (small thumbnail) and the fullscreen overlay (large display).
 */
export const StimulusSVG = memo(function StimulusSVG({
  stimulus,
  className,
  letterColor,
  numberColor,
  arrowColor,
  soundColor,
}: {
  stimulus: Stimulus;
  className?: string;
  letterColor?: string;
  numberColor?: string;
  arrowColor?: string;
  soundColor?: string;
}) {
  if (stimulus.kind === "color") {
    return <ColorStimulusSVG stimulus={stimulus} className={className} />;
  }
  if (stimulus.kind === "letter") {
    return (
      <LetterStimulusSVG
        stimulus={stimulus}
        className={className}
        color={letterColor}
      />
    );
  }
  if (stimulus.kind === "number") {
    return (
      <NumberStimulusSVG
        stimulus={stimulus}
        className={className}
        color={numberColor}
      />
    );
  }
  if (stimulus.kind === "arrow") {
    return (
      <ArrowStimulusSVG
        stimulus={stimulus}
        className={className}
        color={arrowColor}
      />
    );
  }
  // sound
  return (
    <SoundStimulusSVG
      stimulus={stimulus}
      className={className}
      color={soundColor}
    />
  );
});
