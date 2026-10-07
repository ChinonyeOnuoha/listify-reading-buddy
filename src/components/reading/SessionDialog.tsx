import type { ReactNode, RefObject } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  /** Called with false on Escape or the safe action. */
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  /** Runs on the confirm action; the dialog stays open until the caller closes it (so problems can be explained first). */
  onConfirm: () => void;
  busy?: boolean;
  /** Where focus goes when the dialog closes (the control that opened it). */
  returnFocus?: RefObject<HTMLElement | null>;
};

/**
 * The project's accessible alert dialog (Radix): focus starts on the safe (cancel) action, stays inside the dialog,
 * Escape cancels, and focus returns to the control that opened it. No close icon — the two actions are the choices.
 */
export function SessionDialog(p: Props) {
  return (
    <AlertDialog open={p.open} onOpenChange={p.onOpenChange}>
      <AlertDialogContent
        className="w-[calc(100%-2rem)] max-w-md gap-5 rounded-[26px] border-border bg-card p-6 text-foreground shadow-lg sm:p-8"
        onCloseAutoFocus={(e) => {
          if (!p.returnFocus?.current) return;
          e.preventDefault();
          p.returnFocus.current.focus();
        }}
      >
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-xl font-medium text-heading">{p.title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-base text-muted-foreground">{p.children}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel className="mt-0 h-auto min-h-11 rounded-[14px] border-line bg-card px-5 text-base font-medium text-primary hover:bg-tint hover:text-primary">
            {p.cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={p.busy}
            className="h-auto min-h-11 rounded-[14px] bg-primary px-5 text-base font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={(e) => {
              e.preventDefault(); // keep the dialog open until the caller decides
              p.onConfirm();
            }}
          >
            {p.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
