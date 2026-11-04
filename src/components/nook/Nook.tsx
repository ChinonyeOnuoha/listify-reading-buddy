import { useEffect, useId, useState } from "react";

export type NookProps = {
  focus?: "home" | "adult" | "child";
  minutes?: number | null;
  reading?: "none" | "pages" | "text" | "sample";
  cushion?: string | null;
  lamp?: boolean;
  kidCushion?: string | null;
  kidBook?: boolean;
  kidLamp?: boolean;
  shelf?: number;
  className?: string;
};

/** Evening palette for the room. */
const eve = {
  wall: "#1C2541",
  wainscot: "#18203A",
  rail: "#2A3352",
  skirting: "#141B31",
  floor: "#2B2A36",
  floorLine: "#232230",
  rug: "#5A3E32",
  rugLine: "#7A5A46",
  sky: "#0B1A4F",
  moon: 1,
  stars: 1,
  brick: "#4A1E1E",
  brickWin: "#FBA957",
  branch: "#14110C",
  leafA: "#6E7A2E",
  leafB: "#3F4A1E",
  frame: "#C9BFA8",
  sill: "#B8AE97",
  plant: "#3F5A2C",
  wire: "#5C5A6A",
  bulb: "#FBA957",
  halo: 0.3,
  wood: "#5A3B28",
  woodDark: "#43291B",
  metal: "#9A8466",
  dot: "#E2919A",
  chairOff: "#2C4448",
  chairOn: "#3C7A80",
  seatOff: "#33494D",
  seatOn: "#468A90",
} as const;

const LABEL_FONT = "Atkinson Hyperlegible Next Variable, Atkinson Hyperlegible Next, sans-serif";

const fillFade = (seconds: number) => `fill ${seconds}s ease-out`;

/**
 * An evening reading nook that reflects the reader's practice setup.
 *
 * - `focus`: which seat is in use. "adult" dims the children's corner, "child" dims and fades the
 *   armchair, "home" shows both evenly.
 * - `minutes`: the daily reading time, drawn as a filled arc and number on the wall clock. Unset (or 0)
 *   shows a dash and "not set".
 * - `reading`: what rests on the armchair seat: loose pages, a text on a tablet, or a sample booklet.
 * - `cushion`: hex colour of the armchair cushion; null hides the cushion.
 * - `lamp`: switches on the arc floor lamp, which lights the armchair with a beam and floor pool.
 * - `kidCushion`: hex colour of the beanbag in the children's corner; null shows it in a neutral grey.
 * - `kidBook`: places a picture book on the beanbag.
 * - `kidLamp`: lights the hanging lantern over the beanbag.
 * - `shelf`: how many books (0 to 4) stand on the bookcase's second shelf.
 * - `className`: passed through to the root `<svg>`, which fills its parent.
 *
 * Pieces that are still unset (the clock, armchair, lamp and children's corner) are drawn as a soft,
 * desaturated sketch and come into focus once chosen. Buddy waves twice on arrival unless the viewer
 * prefers reduced motion.
 */
export function Nook(props: NookProps) {
  const {
    focus = "home",
    minutes: minutesProp = null,
    reading = "none",
    cushion: cushionProp = null,
    lamp = false,
    kidCushion: kidCushionProp = null,
    kidBook = false,
    kidLamp = false,
    shelf: shelfProp = 0,
    className,
  } = props;

  // Unique ids so several nooks on one page keep their own filter, gradients and clip path.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = {
    sketch: `nook-sketch-${uid}`,
    beam: `nook-beam-${uid}`,
    pool: `nook-pool-${uid}`,
    kidPool: `nook-kidpool-${uid}`,
    win: `nook-win-${uid}`,
  };
  const SK = `url(#${ids.sketch})`;

  // Buddy's wave plays on the client only, and not when reduced motion is preferred.
  const [wave, setWave] = useState(false);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setWave(!reduce);
  }, []);

  // ---- computed values ----
  const c = eve;
  const minutes = minutesProp ? String(minutesProp) : "";
  const cushionSet = !!cushionProp && cushionProp !== "none";
  const kidCushionSet = !!kidCushionProp && kidCushionProp !== "none";
  const shelf = Math.max(0, Math.min(4, Math.trunc(Number(shelfProp)) || 0));
  const chairSet = reading !== "none" || cushionSet || lamp;
  const kidSet = kidCushionSet || kidBook || kidLamp;
  const lit = lamp;

  // Reading-time arc on the clock face.
  const m = Math.max(0, Math.min(60, Math.trunc(Number(minutes || "0")) || 0));
  const a = (m / 60) * Math.PI * 2;
  const cx = 560;
  const cy = 160;
  const r = 37;
  const ex = cx + r * Math.sin(a);
  const ey = cy - r * Math.cos(a);
  const large = m > 30 ? 1 : 0;
  const clockArc =
    m > 0
      ? `M${cx} ${cy} L${cx} ${cy - r} A${r} ${r} 0 ${large} 1 ${ex.toFixed(1)} ${ey.toFixed(1)} Z`
      : "";
  const clockArcEdge =
    m > 0
      ? `M${cx} ${cy - r + 3} A${r - 3} ${r - 3} 0 ${large} 1 ${(cx + (r - 3) * Math.sin(a)).toFixed(1)} ${(cy - (r - 3) * Math.cos(a)).toFixed(1)}`
      : "";
  const clockNum = minutes || "–";
  const clockUnit = minutes ? "min a day" : "not set";

  const alt =
    "A reading nook: an armchair beside an arc floor lamp, a wall clock, a window onto ginkgo leaves, and a children’s corner with a beanbag and a basket of picture books." +
    (lit ? " The lamp is on and lights the armchair." : "") +
    (kidLamp ? " The lantern lights the beanbag." : "");

  const fClock = minutes ? undefined : SK;
  const fChair = chairSet ? undefined : SK;
  const fLamp = lamp ? undefined : SK;
  const fKid = kidSet ? undefined : SK;
  const oLamp = lamp ? 1 : 0.7;

  const s1 = shelf > 0 ? 1 : 0;
  const s2 = shelf > 1 ? 1 : 0;
  const s3 = shelf > 2 ? 1 : 0;
  const s4 = shelf > 3 ? 1 : 0;

  const lampBeam = lit ? 0.75 : 0;
  const lampPool = lit ? 0.8 : 0;
  const lampShade = lit ? "#E5AE6E" : "#5A5262";
  const lampBulb = lit ? "#FFF1CF" : "#3A3646";
  const chair = lit ? c.chairOn : c.chairOff;
  const chairSeat = lit ? c.seatOn : c.seatOff;
  const chairOp = focus === "child" ? 0.5 : 1;

  const cushion = cushionSet && cushionProp ? cushionProp : "#D7E259";
  const cushionOp = cushionSet ? 1 : 0;
  const readOp = reading === "none" ? 0 : 1;
  const isPages = reading === "pages" ? 1 : 0;
  const isText = reading === "text" ? 1 : 0;
  const isSample = reading === "sample" ? 1 : 0;

  const cornerOp = 1;
  const dimCorner = focus === "adult" ? 0.45 : 0;
  const dimChair = focus === "child" ? 0.45 : 0;
  const kidPool = kidLamp ? 0.7 : 0;
  const kidBeam = kidLamp ? 0.55 : 0;
  const kidLampGlass = kidLamp ? "#FFE3B0" : "#3A3646";
  const kidCushion = kidCushionSet && kidCushionProp ? kidCushionProp : "#4A4A5E";
  const kidBookOp = kidBook ? 1 : 0;

  const chairFill = { fill: chair, transition: fillFade(1.4) };

  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      role="img"
      aria-label={alt}
      className={className}
    >
      <defs>
        <filter id={ids.sketch} x="-15%" y="-15%" width="130%" height="130%">
          <feColorMatrix type="saturate" values="0.12" />
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <linearGradient id={ids.beam} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#FFE2AE" stopOpacity=".95" />
          <stop offset="1" stopColor="#FFC978" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={ids.pool} cx="0.5" cy="0.45" r="0.5">
          <stop offset="0" stopColor="#FFD596" stopOpacity=".85" />
          <stop offset="1" stopColor="#FFD596" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={ids.kidPool} cx="0.5" cy="0.4" r="0.5">
          <stop offset="0" stopColor="#FFD596" stopOpacity=".8" />
          <stop offset="1" stopColor="#FFD596" stopOpacity="0" />
        </radialGradient>
        <clipPath id={ids.win}>
          <path d="M300 300 V140 A80 80 0 0 1 460 140 V300 Z" />
        </clipPath>
      </defs>

      {/* room */}
      <rect x="0" y="0" width="800" height="600" fill={c.wall} />
      <rect x="0" y="336" width="800" height="104" fill={c.wainscot} />
      <path d="M0 336 H800" stroke={c.rail} strokeWidth="4" />
      <g stroke={c.rail} strokeWidth="1.5" opacity=".6">
        <path d="M40 350 V428 M120 350 V428 M200 350 V428 M280 350 V428 M520 350 V428 M600 350 V428 M680 350 V428 M760 350 V428" />
      </g>
      <rect x="0" y="436" width="800" height="8" fill={c.skirting} />
      <rect x="0" y="444" width="800" height="156" fill={c.floor} />
      <g stroke={c.floorLine} strokeWidth="2">
        <path d="M0 478 H800 M0 520 H800 M0 566 H800" />
        <path d="M120 444 V478 M330 478 V520 M560 444 V478 M700 520 V566 M210 520 V566 M460 566 V600" />
      </g>

      {/* window with ginkgo view */}
      <g clipPath={`url(#${ids.win})`}>
        <rect x="290" y="50" width="180" height="260" fill={c.sky} />
        <circle cx="430" cy="100" r="13" fill="#F4EADB" opacity={c.moon} />
        <g fill="#F4EADB" opacity={c.stars}>
          <circle cx="330" cy="150" r="1.6" />
          <circle cx="400" cy="120" r="1.3" />
          <circle cx="352" cy="200" r="1.2" />
          <circle cx="440" cy="170" r="1.4" />
        </g>
        <rect x="410" y="170" width="60" height="140" fill={c.brick} />
        <g fill={c.brickWin}>
          <rect x="420" y="184" width="11" height="15" />
          <rect x="442" y="184" width="11" height="15" />
          <rect x="420" y="214" width="11" height="15" />
          <rect x="442" y="214" width="11" height="15" />
          <rect x="420" y="244" width="11" height="15" />
          <rect x="442" y="244" width="11" height="15" />
        </g>
        <path
          d="M290 110 C340 130 370 118 440 92 M335 124 C344 160 336 190 320 214"
          stroke={c.branch}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <g fill={c.leafB}>
          <circle cx="312" cy="96" r="30" />
          <circle cx="356" cy="80" r="32" />
          <circle cx="404" cy="94" r="28" />
          <circle cx="446" cy="78" r="26" />
          <circle cx="306" cy="146" r="22" />
          <circle cx="332" cy="176" r="16" />
        </g>
        <g fill={c.leafA}>
          <circle cx="320" cy="86" r="18" />
          <circle cx="362" cy="70" r="19" />
          <circle cx="410" cy="86" r="16" />
          <circle cx="450" cy="70" r="14" />
          <circle cx="312" cy="140" r="12" />
        </g>
        <g fill={c.leafA}>
          <ellipse cx="372" cy="196" rx="5" ry="3" />
          <ellipse cx="396" cy="246" rx="5" ry="3" />
          <ellipse cx="344" cy="262" rx="4.5" ry="2.6" />
          <ellipse cx="384" cy="150" rx="4.5" ry="2.6" />
        </g>
      </g>
      <path
        d="M300 300 V140 A80 80 0 0 1 460 140 V300 Z"
        fill="none"
        stroke={c.frame}
        strokeWidth="10"
      />
      <path d="M380 60 V300 M300 178 H460" stroke={c.frame} strokeWidth="6" />
      <rect x="288" y="298" width="184" height="14" rx="3" fill={c.sill} />
      <rect x="306" y="276" width="26" height="22" rx="3" fill="#C7894C" />
      <g fill={c.plant}>
        <ellipse cx="312" cy="266" rx="6" ry="13" transform="rotate(-22 312 266)" />
        <ellipse cx="326" cy="264" rx="6" ry="14" transform="rotate(20 326 264)" />
        <ellipse cx="319" cy="260" rx="5" ry="14" />
      </g>

      {/* string lights */}
      <path d="M0 34 Q400 112 800 34" stroke={c.wire} strokeWidth="1.8" fill="none" />
      <g fill="#FBA957" opacity={c.halo}>
        <circle cx="60" cy="47" r="11" />
        <circle cx="140" cy="60" r="11" />
        <circle cx="220" cy="68" r="11" />
        <circle cx="580" cy="68" r="11" />
        <circle cx="660" cy="60" r="11" />
        <circle cx="740" cy="47" r="11" />
      </g>
      <g fill={c.bulb}>
        <circle cx="60" cy="47" r="5" />
        <circle cx="140" cy="60" r="5" />
        <circle cx="220" cy="68" r="5" />
        <circle cx="300" cy="72" r="5" />
        <circle cx="460" cy="72" r="5" />
        <circle cx="580" cy="68" r="5" />
        <circle cx="660" cy="60" r="5" />
        <circle cx="740" cy="47" r="5" />
      </g>

      {/* bookcase: the second shelf fills as books are added */}
      <rect x="700" y="150" width="96" height="292" rx="4" fill={c.wood} />
      <rect x="708" y="158" width="80" height="276" fill={c.woodDark} />
      <rect x="708" y="230" width="80" height="6" fill={c.wood} />
      <rect x="708" y="310" width="80" height="6" fill={c.wood} />
      <rect x="708" y="390" width="80" height="6" fill={c.wood} />
      <g>
        <rect x="714" y="186" width="10" height="44" fill="#245982" />
        <rect x="726" y="194" width="9" height="36" fill="#E3A69A" />
        <rect x="737" y="182" width="12" height="48" fill="#53683A" />
        <rect x="751" y="190" width="9" height="40" fill="#C7894C" />
        <rect
          x="764"
          y="196"
          width="10"
          height="34"
          fill="#3B6F76"
          transform="rotate(10 769 230)"
        />
      </g>
      <g>
        <rect x="714" y="270" width="10" height="40" fill="#E5AE6E" opacity={s1} />
        <rect x="726" y="264" width="10" height="46" fill="#A9B98A" opacity={s2} />
        <rect x="738" y="272" width="10" height="38" fill="#E2919A" opacity={s3} />
        <rect x="750" y="266" width="10" height="44" fill="#5AA6E9" opacity={s4} />
      </g>
      <circle cx="760" cy="372" r="13" fill="#53683A" />
      <rect x="754" y="378" width="12" height="12" fill="#C7894C" />
      <rect x="716" y="368" width="30" height="8" fill="#E3A69A" />
      <rect x="718" y="376" width="26" height="14" fill="#245982" />

      {/* big plant (left) */}
      <rect x="34" y="392" width="62" height="50" rx="6" fill="#C7894C" />
      <g fill={c.plant}>
        <ellipse cx="50" cy="352" rx="13" ry="40" transform="rotate(-22 50 352)" />
        <ellipse cx="82" cy="344" rx="13" ry="44" transform="rotate(18 82 344)" />
        <ellipse cx="66" cy="334" rx="12" ry="48" />
        <ellipse cx="40" cy="380" rx="10" ry="26" transform="rotate(-55 40 380)" />
      </g>

      {/* notes & samples: wall letter rack */}
      <g>
        <rect x="176" y="118" width="64" height="78" rx="6" fill={c.wood} />
        <rect x="184" y="128" width="48" height="58" rx="3" fill={c.woodDark} />
        <rect
          x="190"
          y="122"
          width="30"
          height="40"
          rx="2"
          fill="#FCFCF5"
          transform="rotate(-6 205 142)"
        />
        <path
          d="M192 128 L206 140 L220 126"
          stroke="#C2B8AA"
          strokeWidth="1.6"
          fill="none"
          transform="rotate(-6 205 142)"
        />
        <rect
          x="204"
          y="130"
          width="26"
          height="34"
          rx="2"
          fill="#F6E3DE"
          transform="rotate(5 217 147)"
        />
        <rect x="184" y="160" width="48" height="26" rx="3" fill={c.wood} />
        <circle cx="208" cy="173" r="5" fill={c.dot} />
      </g>

      {/* wall clock: reading time */}
      <g filter={fClock} style={minutes ? undefined : { opacity: 0.55 }}>
        <circle cx="560" cy="160" r="44" fill={c.wood} />
        <circle cx="560" cy="160" r="37" fill="#FCFCF5" />
        {clockArc && <path d={clockArc} fill="#245982" opacity=".22" />}
        {clockArcEdge && (
          <path
            d={clockArcEdge}
            stroke="#245982"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        )}
        <g stroke="#4B5539" strokeWidth="2">
          <path d="M560 126 V132 M594 160 H588 M560 194 V188 M526 160 H532" />
        </g>
        <text
          x="560"
          y="166"
          textAnchor="middle"
          fontFamily={LABEL_FONT}
          fontSize="20"
          fontWeight="700"
          fill="#1B2116"
        >
          {clockNum}
        </text>
        <text
          x="560"
          y="180"
          textAnchor="middle"
          fontFamily={LABEL_FONT}
          fontSize="9"
          fill="#4B5539"
        >
          {clockUnit}
        </text>
      </g>

      {/* rug */}
      <ellipse cx="400" cy="548" rx="250" ry="42" fill={c.rug} />
      <ellipse
        cx="400"
        cy="548"
        rx="220"
        ry="32"
        fill="none"
        stroke={c.rugLine}
        strokeWidth="3"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />

      {/* lamp light (drawn under furniture, above floor) */}
      <ellipse
        cx="378"
        cy="450"
        rx="150"
        ry="110"
        fill={`url(#${ids.pool})`}
        style={{ opacity: lampPool, transition: "opacity 1.4s ease-out .2s" }}
      />
      <path
        d="M276 236 L318 226 L500 512 L262 528 Z"
        fill={`url(#${ids.beam})`}
        style={{ opacity: lampBeam, transition: "opacity 1.2s ease-out" }}
      />

      {/* arc floor lamp, head leaning toward the chair */}
      <g filter={fLamp} style={{ opacity: oLamp, transition: "opacity .8s" }}>
        <ellipse cx="170" cy="526" rx="36" ry="9" fill={c.metal} />
        <path
          d="M170 526 V250 Q170 180 236 176 Q272 176 290 204"
          stroke={c.metal}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <g transform="rotate(-28 298 222)">
          <path
            d="M268 212 Q298 176 328 212 Z"
            style={{ fill: lampShade, transition: fillFade(1) }}
          />
          <ellipse
            cx="298"
            cy="214"
            rx="14"
            ry="5"
            style={{ fill: lampBulb, transition: fillFade(0.8) }}
          />
        </g>
      </g>

      {/* armchair (main practice seat) */}
      <g filter={fChair} style={{ opacity: chairOp, transition: "opacity .6s" }}>
        <rect x="304" y="440" width="10" height="24" rx="2" fill={c.woodDark} />
        <rect x="446" y="440" width="10" height="24" rx="2" fill={c.woodDark} />
        <rect x="300" y="476" width="10" height="26" rx="2" fill={c.woodDark} />
        <rect x="450" y="476" width="10" height="26" rx="2" fill={c.woodDark} />
        <rect x="312" y="318" width="136" height="126" rx="42" style={chairFill} />
        <g fill="#000" fillOpacity=".14">
          <circle cx="350" cy="358" r="3.5" />
          <circle cx="380" cy="352" r="3.5" />
          <circle cx="410" cy="358" r="3.5" />
        </g>
        <rect
          x="300"
          y="420"
          width="160"
          height="62"
          rx="18"
          style={{ fill: chairSeat, transition: fillFade(1.4) }}
        />
        <g style={{ opacity: cushionOp, transition: "opacity .5s" }}>
          <ellipse cx="380" cy="397" rx="51" ry="32" fill="#000" fillOpacity=".24" />
          <ellipse
            cx="380"
            cy="392"
            rx="50"
            ry="32"
            stroke="#FFF"
            strokeOpacity=".22"
            strokeWidth="1.5"
            style={{ fill: cushion, transition: fillFade(1.4) }}
          />
          <ellipse
            cx="380"
            cy="392"
            rx="38"
            ry="21"
            fill="none"
            stroke="#000"
            strokeOpacity=".16"
            strokeWidth="1.6"
            strokeDasharray="3 5"
          />
        </g>
        <g style={{ opacity: readOp, transition: "opacity .5s" }}>
          <g opacity={isPages} transform="rotate(-8 384 438)">
            <rect x="354" y="424" width="56" height="30" rx="2" fill="#FCFCF5" stroke="#C2B8AA" />
            <rect x="350" y="420" width="56" height="30" rx="2" fill="#FCFCF5" stroke="#C2B8AA" />
            <path
              d="M358 430 H398 M358 436 H398 M358 442 H388"
              stroke="#9A9F86"
              strokeWidth="1.6"
            />
            <rect x="372" y="415" width="12" height="9" rx="2" fill="#245982" />
          </g>
          <g opacity={isText} transform="rotate(-6 384 438)">
            <rect x="352" y="420" width="62" height="34" rx="3" fill="#245982" />
            <rect x="356" y="423" width="54" height="28" rx="2" fill="#FCFCF5" />
            <path
              d="M362 431 H404 M362 437 H404 M362 443 H394"
              stroke="#9A9F86"
              strokeWidth="1.6"
            />
          </g>
          <g opacity={isSample} transform="rotate(-7 384 438)">
            <rect x="352" y="420" width="62" height="32" rx="3" fill="#E5AE6E" />
            <rect x="356" y="423" width="54" height="5" fill="#FCFCF5" />
            <text
              x="383"
              y="445"
              textAnchor="middle"
              fontFamily={LABEL_FONT}
              fontSize="9"
              fontWeight="700"
              fill="#1B1309"
            >
              SAMPLE
            </text>
          </g>
        </g>
        <rect x="284" y="384" width="44" height="104" rx="20" style={chairFill} />
        <rect x="432" y="384" width="44" height="104" rx="20" style={chairFill} />
      </g>

      {/* side table with Buddy */}
      <rect x="484" y="414" width="58" height="8" rx="3" fill={c.wood} />
      <path
        d="M492 422 L488 520 M534 422 L538 520"
        stroke={c.woodDark}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="494" y="398" width="16" height="16" rx="3" fill="#FCFCF5" />
      <path d="M510 403 q7 0 7 5 q0 5 -7 5" stroke="#FCFCF5" strokeWidth="2.5" fill="none" />
      {/* Buddy, the bookmark companion (apricot body, ink outline, folded corner); waves twice on arrival */}
      <g transform="translate(510 360) scale(.36)">
        <path d="M28 62 L18 74" stroke="#FCBC88" strokeWidth="4.2" strokeLinecap="round" />
        <g>
          <path d="M72 58 L86 42" stroke="#FCBC88" strokeWidth="4.2" strokeLinecap="round" />
          <circle cx="87" cy="40" r="3.4" fill="#FCBC88" stroke="#E58A45" strokeWidth="2" />
          {wave && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 72 58;-16 72 58;10 72 58;0 72 58"
              keyTimes="0;.25;.6;1"
              dur="1.1s"
              begin="0.5s"
              repeatCount="2"
            />
          )}
        </g>
        <path
          d="M32 6 H60 L72 18 V100 L50 87 L28 100 V10 Q28 6 32 6 Z"
          fill="#FCBC88"
          stroke="#0B2560"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M60 6 V14 Q60 18 64 18 H72 Z"
          fill="#FDE8D3"
          stroke="#0B2560"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="42" cy="40" r="2.6" fill="#0B2560" />
        <circle cx="58" cy="40" r="2.6" fill="#0B2560" />
        <circle cx="36" cy="49" r="3.4" fill="#E58A45" opacity=".35" />
        <circle cx="64" cy="49" r="3.4" fill="#E58A45" opacity=".35" />
        <path
          d="M44 48 Q50 54 56 48"
          stroke="#0B2560"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="35" cy="106" rx="7" ry="4" fill="#FCBC88" stroke="#E58A45" strokeWidth="2.2" />
        <ellipse cx="65" cy="106" rx="7" ry="4" fill="#FCBC88" stroke="#0B2560" strokeWidth="2.2" />
      </g>

      {/* children's corner: bunting, hanging lantern, basket, beanbag */}
      <g filter={fKid} style={{ opacity: cornerOp, transition: "opacity .6s" }}>
        <path d="M562 246 Q626 272 690 246" stroke={c.wire} strokeWidth="1.5" fill="none" />
        <g>
          <path d="M570 250 l8 16 l8 -13 Z" fill="#E3A69A" />
          <path d="M592 257 l8 16 l8 -14 Z" fill="#D7E259" />
          <path d="M616 260 l8 16 l8 -16 Z" fill="#5AA6E9" />
          <path d="M640 259 l8 16 l8 -14 Z" fill="#E5AE6E" />
          <path d="M664 254 l8 15 l8 -13 Z" fill="#A9A6E8" />
        </g>
        <ellipse
          cx="632"
          cy="486"
          rx="110"
          ry="80"
          fill={`url(#${ids.kidPool})`}
          style={{ opacity: kidPool, transition: "opacity 1.4s ease-out .2s" }}
        />
        <path d="M598 290 V316" stroke={c.metal} strokeWidth="2" />
        <rect x="588" y="316" width="20" height="28" rx="5" fill={c.metal} />
        <rect
          x="592"
          y="320"
          width="12"
          height="20"
          rx="3"
          style={{ fill: kidLampGlass, transition: "fill 1s" }}
        />
        <path
          d="M592 340 L572 470 L700 470 L606 340 Z"
          fill={`url(#${ids.beam})`}
          style={{ opacity: kidBeam, transition: "opacity 1.2s ease-out" }}
        />
        <rect x="546" y="490" width="46" height="34" rx="6" fill="#A0704A" />
        <path d="M546 500 H592 M546 510 H592" stroke="#7E5537" strokeWidth="2" />
        <rect x="552" y="470" width="9" height="22" fill="#E2919A" />
        <rect x="563" y="466" width="9" height="26" fill="#5AA6E9" />
        <rect x="574" y="472" width="8" height="20" fill="#D7E259" />
        <rect x="583" y="468" width="7" height="24" fill="#E5AE6E" />
        <path
          d="M590 528 C578 470 604 446 636 446 C672 446 692 478 684 528 Z"
          stroke="#000"
          strokeOpacity=".22"
          strokeWidth="2"
          style={{ fill: kidCushion, transition: fillFade(1.4) }}
        />
        <path
          d="M604 470 C620 462 650 462 666 474"
          stroke="#000"
          strokeOpacity=".12"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <g
          style={{ opacity: kidBookOp, transition: "opacity .5s" }}
          transform="rotate(-10 638 492)"
        >
          <rect x="614" y="480" width="48" height="26" rx="3" fill="#E5AE6E" />
          <path d="M638 480 V506" stroke="#C7894C" strokeWidth="2" />
          <circle cx="626" cy="492" r="5" fill="#E2919A" />
          <circle cx="650" cy="492" r="5" fill="#5AA6E9" />
        </g>
      </g>

      {/* dim overlays for the seat not in use */}
      <rect
        x="540"
        y="236"
        width="160"
        height="300"
        fill={c.wall}
        style={{ opacity: dimCorner, transition: "opacity .6s" }}
      />
      <rect
        x="270"
        y="300"
        width="214"
        height="214"
        fill={c.wall}
        style={{ opacity: dimChair, transition: "opacity .6s" }}
      />
    </svg>
  );
}
