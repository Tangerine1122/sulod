const POINTS = Array.from({ length: 61 }, (_, i) => `${i * 6},${i % 2 === 0 ? 0 : 10}`).join(" ");

/** The torn-receipt edge. Place directly under (or, with `flip`, above) a block of the same color. */
export function Zigzag({ className = "fill-ink", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 10"
      preserveAspectRatio="none"
      className={`block h-2.5 w-full ${flip ? "-scale-y-100" : ""} ${className}`}
    >
      <polygon points={POINTS} />
    </svg>
  );
}
