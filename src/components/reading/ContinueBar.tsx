import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

type Props = {
  onContinue: () => void;
  /** Height the page must reserve so the fixed bar never covers content (0 when the bar is in the flow). */
  onReserve: (px: number) => void;
};

/**
 * True while an on-screen keyboard is likely open over a focused text field: the visual viewport is much
 * shorter than the layout viewport. Desktop browsers never trigger this.
 */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const check = () => {
      const el = document.activeElement;
      const typing = !!el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && (el as HTMLInputElement).type !== "file"));
      setOpen(typing && window.innerHeight - vv.height > 120);
    };
    vv.addEventListener("resize", check);
    document.addEventListener("focusin", check);
    document.addEventListener("focusout", check);
    return () => {
      vv.removeEventListener("resize", check);
      document.removeEventListener("focusin", check);
      document.removeEventListener("focusout", check);
    };
  }, []);
  return open;
}

/**
 * The single "Continue to reading" action: an opaque bar fixed to the bottom on every screen size.
 * While a phone keyboard is open it drops into the page flow instead, so it never sits on top of the field being typed in;
 * it stays reachable by scrolling and returns to the bottom when the keyboard closes.
 */
export function ContinueBar({ onContinue, onReserve }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const keyboardOpen = useKeyboardOpen();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const report = () => onReserve(keyboardOpen ? 0 : el.offsetHeight);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => {
      ro.disconnect();
      onReserve(0);
    };
  }, [keyboardOpen, onReserve]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Next step"
      className={keyboardOpen ? "" : "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background"}
    >
      <div
        className={
          keyboardOpen
            ? "flex"
            : "mx-auto flex max-w-3xl justify-end px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4"
        }
      >
        <button className="btn-primary btn-pill w-full sm:w-auto sm:min-w-72" onClick={onContinue}>
          Continue to reading <ArrowRight className="size-[18px]" aria-hidden />
        </button>
      </div>
    </div>
  );
}
