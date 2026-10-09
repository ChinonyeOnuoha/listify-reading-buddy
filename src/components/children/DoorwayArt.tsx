import { Companion } from "@/components/reading/Companion";

/**
 * The doorway to the children's corner, drawn as vectors in the app's own style (ink outline, apricot fill, the same bookmark
 * character standing inside). Being vector it stays sharp at any size and pixel density. Decorative only.
 */
export function DoorwayArt({ className = "" }: { className?: string }) {
  const ink = "var(--ink)";
  return (
    <span aria-hidden className={`relative block aspect-[11/10] ${className}`}>
      <svg viewBox="0 0 220 200" className="absolute inset-0 size-full" focusable="false">
        {/* ground shadow */}
        <ellipse cx="110" cy="189" rx="92" ry="6" fill={ink} opacity=".08" />
        {/* little plants */}
        <g fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 188 V160 M16 172 C8 168 6 160 8 154 M16 166 C24 162 26 154 24 148" />
          <path d="M206 188 V164 M206 176 C198 172 196 166 198 160 M206 170 C214 166 216 158 214 152" />
        </g>
        {/* arch frame */}
        <path
          d="M26 186 V90 C26 42 66 12 110 12 C154 12 194 42 194 90 V186 Z"
          fill="var(--apricot)"
          stroke={ink}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {/* night inside */}
        <path d="M48 186 V94 C48 58 76 34 110 34 C144 34 172 58 172 94 V186 Z" fill={ink} />
        <g fill="var(--ivory-card)">
          <circle cx="96" cy="58" r="1.8" />
          <circle cx="124" cy="48" r="1.4" />
          <circle cx="158" cy="86" r="1.8" />
          <circle cx="150" cy="120" r="1.4" />
          <circle cx="82" cy="104" r="1.4" />
        </g>
        <path
          d="M140 62 l3.6 7.6 8.2 1 -6 5.8 1.6 8.2 -7.4 -4 -7.4 4 1.6 -8.2 -6 -5.8 8.2 -1 z"
          fill="var(--apricot)"
        />
        {/* the open door */}
        <path
          d="M48 186 V98 C48 66 60 52 80 46 V180 Z"
          fill="var(--apricot-tint)"
          stroke={ink}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M62 80 l2.2 4.6 5 .6 -3.7 3.6 1 5 -4.5 -2.4 -4.5 2.4 1 -5 -3.7 -3.6 5 -.6 z"
          fill={ink}
        />
        <circle cx="72" cy="132" r="2.6" fill={ink} />
        {/* ground line */}
        <path d="M26 186 H194" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      {/* the bookmark companion, standing in the doorway */}
      <Companion pose="wave" className="absolute right-[15%] bottom-[7%] w-[32%]" />
    </span>
  );
}
