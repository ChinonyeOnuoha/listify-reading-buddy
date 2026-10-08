import { Download } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  /** The browser has offered its install prompt (Chrome, Edge, Android). */
  canInstall: boolean;
  /** Safari on iPhone/iPad has no prompt API; show the Share → Add to Home Screen steps instead. */
  ios: boolean;
  onInstall: () => void;
};

/** Compact "Install app" control for the welcome header. Renders nothing when installing isn't possible. */
export function InstallButton({ canInstall, ios, onInstall }: Props) {
  if (canInstall) {
    return (
      <button type="button" className="btn-header" onClick={onInstall}>
        <Download className="size-4" aria-hidden /> Install app
      </button>
    );
  }
  if (!ios) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="btn-header">
          <Download className="size-4" aria-hidden /> Install app
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 rounded-2xl border-border bg-card p-4 text-sm text-foreground shadow-none"
      >
        In Safari, tap Share, then “Add to Home Screen”. Sessions still clear when the app is
        closed.
      </PopoverContent>
    </Popover>
  );
}
