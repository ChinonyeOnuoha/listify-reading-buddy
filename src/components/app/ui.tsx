import { useEffect, useRef, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Alert from "@radix-ui/react-alert-dialog";
import { ArrowLeft, X } from "lucide-react";

/** A dialog on wide screens and a bottom sheet on narrow ones, with the same content. */
export function Modal({
  open,
  onClose,
  title,
  titleClassName = "",
  hideTitle = false,
  description,
  children,
  className = "",
  initialFocus,
  returnFocus,
  closeButton = true,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  titleClassName?: string;
  hideTitle?: boolean;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  initialFocus?: React.RefObject<HTMLElement | null>;
  returnFocus?: React.RefObject<HTMLElement | null>;
  closeButton?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="rb-overlay" />
        <Dialog.Content
          className={`rb-dialog ${className}`}
          aria-describedby={description ? undefined : undefined}
          onOpenAutoFocus={(e) => {
            if (initialFocus?.current) {
              e.preventDefault();
              initialFocus.current.focus({ preventScroll: true });
            }
          }}
          onCloseAutoFocus={(e) => {
            if (returnFocus?.current) {
              e.preventDefault();
              returnFocus.current.focus({ preventScroll: true });
            }
          }}
        >
          <span className="rb-grab" aria-hidden />
          <div className={`flex items-start justify-between gap-3 ${hideTitle ? "sr-only" : ""}`}>
            <Dialog.Title
              className={`text-[1.375rem] leading-tight font-semibold ${titleClassName}`}
            >
              {title}
            </Dialog.Title>
            {closeButton && !hideTitle && (
              <Dialog.Close className="btn-icon -mt-1 -mr-1 shrink-0 bg-raised" aria-label="Close">
                <X className="size-[18px]" aria-hidden />
              </Dialog.Close>
            )}
          </div>
          {description ? (
            <Dialog.Description className="lead">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">
              {typeof title === "string" ? title : ""}
            </Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Confirmation for actions that can't be undone. The title names the action, one sentence says what happens,
 * the button repeats the verb, and Cancel is the safe default (it has focus when the dialog opens).
 */
export function Confirm({
  open,
  onCancel,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <Alert.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <Alert.Portal>
        <Alert.Overlay className="rb-overlay" />
        <Alert.Content className="rb-dialog">
          <span className="rb-grab" aria-hidden />
          <Alert.Title className="text-[1.375rem] leading-tight font-semibold">{title}</Alert.Title>
          <Alert.Description asChild>
            <div className="lead space-y-2">{body}</div>
          </Alert.Description>
          <div className="rb-acts">
            <Alert.Cancel className="btn-secondary">{cancelLabel}</Alert.Cancel>
            <Alert.Action
              className={danger ? "btn-danger" : "btn-primary min-h-12 text-base"}
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
            >
              {confirmLabel}
            </Alert.Action>
          </div>
        </Alert.Content>
      </Alert.Portal>
    </Alert.Root>
  );
}

export type ToastMessage = {
  id: number;
  text: string;
  undo?: (() => void) | undefined;
  onExpire?: (() => void) | undefined;
};

/** One message at a time at the bottom of the screen. With Undo it stays for 6 seconds, otherwise 4. */
export function Toast({ toast, onDone }: { toast: ToastMessage | null; onDone: () => void }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(
      () => {
        toast.onExpire?.();
        doneRef.current();
      },
      toast.undo ? 6000 : 4000,
    );
    return () => window.clearTimeout(t);
  }, [toast]);
  return (
    <div role="status" aria-live="polite" className={toast ? "" : "sr-only"}>
      {toast && (
        <div className="rb-toast" key={toast.id}>
          <span>{toast.text}</span>
          {toast.undo ? (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                doneRef.current();
              }}
            >
              Undo
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                toast.onExpire?.();
                doneRef.current();
              }}
            >
              OK
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Back, "Step n of N · name" and a thin segmented bar. */
export function StepHead({
  backLabel = "Back",
  onBack,
  step,
  of,
  name,
}: {
  backLabel?: string;
  onBack: () => void;
  step?: number | undefined;
  of?: number | undefined;
  name?: string;
}) {
  return (
    <>
      <button type="button" className="btn-quiet -mt-2 -ml-2.5 self-start" onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden /> {backLabel}
      </button>
      {step && of ? (
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <span>
            Step {step} of {of}
            {name ? ` · ${name}` : ""}
          </span>
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: of }, (_, i) => (
              <i
                key={i}
                className={`h-1 flex-1 rounded-full ${i < step ? "bg-primary" : "bg-selected"}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

/** A screen's heading. Focus moves here when the screen opens, so keyboard and screen-reader users land on it. */
export function ScreenTitle({
  children,
  kid = false,
  id = "screen-h",
}: {
  children: ReactNode;
  kid?: boolean;
  id?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <h1 ref={ref} id={id} tabIndex={-1} className={`title outline-none ${kid ? "kid" : ""}`}>
      {children}
    </h1>
  );
}
