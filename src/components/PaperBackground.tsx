/**
 * Faint flowing contour lines in the outer margins, over a subtle paper grain (the grain is CSS, see .paper-bg).
 * Purely decorative: hidden from assistive tech, no pointer events, painted behind all content. The lines run along the
 * left and right edges and fade out before the centre column, so they never sit under reading text or controls.
 */
export function PaperBackground() {
  return (
    <div className="paper-bg" aria-hidden="true" data-decorative="paper-background">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id="rb-fade-l" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="white" stopOpacity="1" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rb-fade-r" x1="1" x2="0" y1="0" y2="0">
            <stop offset="0" stopColor="white" stopOpacity="1" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="rb-mask-l" maskUnits="userSpaceOnUse" x="0" y="0" width="1440" height="900">
            <rect x="0" y="0" width="330" height="900" fill="url(#rb-fade-l)" />
          </mask>
          <mask id="rb-mask-r" maskUnits="userSpaceOnUse" x="0" y="0" width="1440" height="900">
            <rect x="1110" y="0" width="330" height="900" fill="url(#rb-fade-r)" />
          </mask>
        </defs>
        <g fill="none" strokeLinecap="round" strokeWidth="1.2">
          <g mask="url(#rb-mask-l)" stroke="var(--ink)" opacity=".07">
            <path d="M-20 120 C120 150 200 60 330 110" />
            <path d="M-20 170 C130 205 220 110 330 160" />
            <path d="M-20 560 C100 520 180 640 330 600" />
            <path d="M-20 610 C110 575 190 690 330 650" />
            <path d="M-20 660 C120 630 200 735 330 700" />
          </g>
          <g mask="url(#rb-mask-r)" stroke="var(--ink)" opacity=".07">
            <path d="M1110 760 C1230 800 1330 720 1460 770" />
            <path d="M1110 810 C1240 850 1340 770 1460 820" />
            <path d="M1110 90 C1220 50 1340 130 1460 80" />
            <path d="M1110 140 C1230 105 1350 180 1460 130" />
          </g>
          <g mask="url(#rb-mask-r)" stroke="var(--apricot-deep)" opacity=".16">
            <path d="M1110 40 C1230 0 1350 80 1460 30" />
            <path d="M1110 710 C1220 750 1320 670 1460 720" />
          </g>
          <g mask="url(#rb-mask-l)" stroke="var(--apricot-deep)" opacity=".16">
            <path d="M-20 520 C100 480 180 600 330 560" />
          </g>
        </g>
      </svg>
    </div>
  );
}
