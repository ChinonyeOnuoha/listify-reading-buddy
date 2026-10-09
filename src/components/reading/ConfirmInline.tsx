import { Check, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
  /** Label of the safe action; defaults to "Keep it". */
  cancelLabel?: string;
};

/** Inline "are you sure?" used before anything clears or replaces a recording. Focus lands on the safe choice. */
export function ConfirmInline({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  className = "",
  cancelLabel = "Keep it",
}: Props) {
  return (
    <div
      className={cn("reveal rounded-2xl border border-primary/40 bg-tint p-4", className)}
      role="alertdialog"
      aria-label="Please confirm"
      aria-describedby="confirm-msg"
    >
      <p id="confirm-msg" className="font-medium">
        {message}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn-primary min-h-11 px-5" onClick={onConfirm}>
          <Check className="size-4" aria-hidden /> {confirmLabel}
        </button>
        <button className="btn-quiet" onClick={onCancel} autoFocus>
          <Undo2 className="size-4" aria-hidden /> {cancelLabel}
        </button>
      </div>
    </div>
  );
}
