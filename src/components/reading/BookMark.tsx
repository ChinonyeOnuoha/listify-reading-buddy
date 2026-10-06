/** Small line illustration of an open book that sits beside the wordmark. Decorative only. */
export function BookMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 36" className={className} aria-hidden="true" focusable="false">
      {/* peach page fills */}
      <path d="M24 11 C18 7 11 7 5 9 V30 C11 28 18 28 24 32 Z" fill="var(--peach)" />
      <path d="M24 11 C30 7 37 7 43 9 V30 C37 28 30 28 24 32 Z" fill="var(--peach)" />
      <g fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {/* covers and spine */}
        <path d="M24 11 C18 7 11 7 5 9 V30 C11 28 18 28 24 32" />
        <path d="M24 11 C30 7 37 7 43 9 V30 C37 28 30 28 24 32" />
        <path d="M24 11 V32" />
        {/* text lines */}
        <path d="M9 14.5 C13 13.5 16.5 13.8 20 15" opacity=".55" />
        <path d="M9 19 C13 18 16.5 18.3 20 19.5" opacity=".55" />
        <path d="M28 15 C31.5 13.8 35 13.5 39 14.5" opacity=".55" />
        <path d="M28 19.5 C31.5 18.3 35 18 39 19" opacity=".55" />
      </g>
      {/* peach sparkle */}
      <g stroke="var(--primary)" strokeWidth="1.6" strokeLinecap="round">
        <path d="M40 2 V6" />
        <path d="M38 4 H42" />
        <path d="M45 6.5 L46.5 5" />
      </g>
    </svg>
  );
}
