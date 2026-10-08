import type { ReactNode } from "react";

export type CompanionPose = "wave" | "peek" | "listen" | "celebrate";

type Props = {
  pose: CompanionPose;
  className?: string;
  /** Waves twice on appearing (wave pose only). Does nothing for reduced-motion users. */
  animate?: boolean;
};

const INK = "var(--ink)";
const APRICOT = "var(--apricot)";
const DEEP = "var(--apricot-deep)";

/**
 * The bookmark companion: a small apricot ribbon with a folded top corner, a V-shaped lower edge, a tiny face, arms and feet.
 * One drawing, four poses. Decorative only — hidden from assistive tech, never focusable, no text of its own.
 * Drawn for this app (no external asset), so there is nothing to download and nothing that can fail to load.
 */
export function Companion({ pose, className = "", animate = false }: Props) {
  // "peek" shows only the top of the ribbon and both hands; the others show the whole figure.
  const viewBox = pose === "peek" ? "0 0 100 64" : "0 0 100 116";
  const stroke = {
    fill: "none",
    stroke: INK,
    strokeWidth: 2.4,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  return (
    <svg
      viewBox={viewBox}
      className={className}
      aria-hidden="true"
      focusable="false"
      data-companion={pose}
    >
      {pose === "celebrate" && (
        <g stroke={DEEP} strokeWidth="2" strokeLinecap="round">
          <path d="M14 14 V22 M10 18 H18" />
          <path d="M88 8 V14 M85 11 H91" />
          <path d="M90 40 l3 -3" />
        </g>
      )}

      {/* arms (drawn first so the body overlaps their roots) */}
      {pose === "wave" && (
        <>
          <path d="M28 62 L18 74" {...stroke} />
          <g className={`companion-wave${animate ? " companion-wave--animate" : ""}`}>
            <path d="M72 58 L86 42" {...stroke} />
            <circle cx="87" cy="40" r="3.4" fill={APRICOT} stroke={INK} strokeWidth="2" />
          </g>
        </>
      )}
      {pose === "celebrate" && (
        <>
          <path d="M28 58 L14 38" {...stroke} />
          <path d="M72 58 L86 38" {...stroke} />
          <circle cx="13" cy="36" r="3.4" fill={APRICOT} stroke={INK} strokeWidth="2" />
          <circle cx="87" cy="36" r="3.4" fill={APRICOT} stroke={INK} strokeWidth="2" />
        </>
      )}
      {pose === "listen" && (
        <>
          <path d="M28 62 L36 78" {...stroke} />
          <path d="M72 62 L64 78" {...stroke} />
        </>
      )}

      {/* body: rounded top-left, folded top-right corner, V-shaped lower edge */}
      <g transform={pose === "celebrate" ? "rotate(-4 50 60)" : undefined}>
        <path
          d="M32 6 H60 L72 18 V100 L50 87 L28 100 V10 Q28 6 32 6 Z"
          fill={APRICOT}
          stroke={INK}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* folded corner */}
        <path
          d="M60 6 V14 Q60 18 64 18 H72 Z"
          fill="var(--apricot-tint)"
          stroke={INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* face */}
        {pose === "listen" ? (
          <>
            {/* content, listening eyes */}
            <path d="M38 40 Q42 36 46 40" {...stroke} strokeWidth={2} />
            <path d="M54 40 Q58 36 62 40" {...stroke} strokeWidth={2} />
          </>
        ) : (
          <>
            <circle cx="42" cy="40" r="2.6" fill={INK} />
            <circle cx="58" cy="40" r="2.6" fill={INK} />
          </>
        )}
        <circle cx="36" cy="49" r="3.4" fill={DEEP} opacity=".35" />
        <circle cx="64" cy="49" r="3.4" fill={DEEP} opacity=".35" />
        {pose === "celebrate" ? (
          <path
            d="M43 48 Q50 59 57 48 Z"
            fill={INK}
            stroke={INK}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        ) : (
          <path d="M44 48 Q50 54 56 48" {...stroke} strokeWidth={2} />
        )}
      </g>

      {pose === "peek" ? (
        // hands holding the edge of the card the ribbon is peeking over
        <>
          <circle cx="30" cy="60" r="4.4" fill={APRICOT} stroke={INK} strokeWidth="2.2" />
          <circle cx="70" cy="60" r="4.4" fill={APRICOT} stroke={INK} strokeWidth="2.2" />
        </>
      ) : (
        // feet
        <>
          <ellipse cx="35" cy="106" rx="7" ry="4" fill={APRICOT} stroke={INK} strokeWidth="2.2" />
          <ellipse cx="65" cy="106" rx="7" ry="4" fill={APRICOT} stroke={INK} strokeWidth="2.2" />
        </>
      )}
    </svg>
  );
}

/**
 * Seats a companion beside a card without covering anything: on narrow screens it stands on the card's top-right edge (the
 * extra top margin keeps it clear of the heading above); on wide screens it sits in the side margin next to the card.
 */
export function CompanionPerch({
  pose,
  animate,
  children,
}: {
  pose: CompanionPose;
  animate?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative mt-12 lg:mt-0">
      <Companion
        pose={pose}
        {...(animate ? { animate } : {})}
        className="pointer-events-none absolute right-6 bottom-[calc(100%-4px)] h-auto w-12 sm:w-14 lg:top-10 lg:-right-[5.5rem] lg:bottom-auto lg:w-16"
      />
      {children}
    </div>
  );
}
