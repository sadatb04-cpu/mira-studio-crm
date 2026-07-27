const BLOBS = [
  {
    color: "var(--aurora-1)",
    className: "left-[-10%] top-[-15%] size-[45vw] animate-[aurora-drift-1_28s_ease-in-out_infinite]",
  },
  {
    color: "var(--aurora-2)",
    className: "right-[-15%] top-[-10%] size-[50vw] animate-[aurora-drift-2_34s_ease-in-out_infinite]",
  },
  {
    color: "var(--aurora-3)",
    className: "bottom-[-20%] left-[10%] size-[42vw] animate-[aurora-drift-3_31s_ease-in-out_infinite]",
  },
  {
    color: "var(--aurora-4)",
    className: "bottom-[-15%] right-[5%] size-[38vw] animate-[aurora-drift-4_26s_ease-in-out_infinite]",
  },
] as const;

// Purely decorative, purely CSS - no JS animation loop, no canvas. Sits
// behind all app content as a fixed layer; -z-10 keeps it behind normal-
// flow siblings while still painting above the body's own background.
export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {BLOBS.map((blob, index) => (
        <div
          key={index}
          className={`aurora-blob absolute rounded-full opacity-[0.16] blur-[110px] will-change-transform ${blob.className}`}
          style={{ backgroundColor: blob.color }}
        />
      ))}
    </div>
  );
}
