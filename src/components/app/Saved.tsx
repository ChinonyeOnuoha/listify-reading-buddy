import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { formatBytes, storageEstimate } from "@/lib/device-store";
import { ScreenTitle, StepHead } from "./ui";

export type SavedItem = {
  id: string;
  title: string;
  detail: string;
  bytes: number;
  onDelete: () => void;
};

/** What is kept on this device, how much room it takes, and the controls to delete it or forget the nook. */
export function SavedPanel({
  items,
  nookLine,
  hasNook,
  onHome,
  onDeleteAll,
  onForget,
}: {
  items: SavedItem[];
  nookLine: string;
  hasNook: boolean;
  onHome: () => void;
  onDeleteAll: () => void;
  onForget: () => void;
}) {
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  useEffect(() => {
    void storageEstimate().then(setEstimate);
  }, [items.length]);
  const used = items.reduce((n, i) => n + i.bytes, 0);
  const pct =
    estimate && estimate.quota
      ? Math.max(1, Math.min(100, (estimate.usage / estimate.quota) * 100))
      : null;

  return (
    <>
      <div className="panel-body">
        <StepHead onBack={onHome} backLabel="Home" />
        <ScreenTitle>Saved on this device</ScreenTitle>
        <p className="lead">
          Kept in this browser only and never uploaded. Anyone using this device can open them.
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between gap-3 text-sm text-muted-foreground">
            <span>{used ? `${formatBytes(used)} used by your readings` : "Nothing saved yet"}</span>
            {estimate && (
              <span>About {formatBytes(Math.max(0, estimate.quota - estimate.usage))} free</span>
            )}
          </div>
          {pct !== null && (
            <div className="track" aria-hidden>
              <div style={{ width: `${pct}%`, background: "#A9B98A" }} />
            </div>
          )}
        </div>
        {items.length > 0 ? (
          <ul className="flex flex-col">
            {items.map((i) => (
              <li
                key={i.id}
                className="flex min-h-16 items-center justify-between gap-3 border-b border-border py-1 last:border-0"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{i.title}</span>
                  <span className="block text-sm text-muted-foreground">{i.detail}</span>
                </span>
                <button
                  type="button"
                  className="btn-icon shrink-0"
                  aria-label={`Delete ${i.title}`}
                  onClick={i.onDelete}
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing saved yet. Your passages, page photos and recordings appear here.
          </p>
        )}
        <div className="border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">Your nook</span>
          <p className="mt-1">{nookLine}</p>
        </div>
      </div>
      <div className="panel-foot">
        {items.length > 0 && (
          <button type="button" className="btn-link is-rose w-full" onClick={onDeleteAll}>
            Delete all readings and recordings
          </button>
        )}
        {hasNook && (
          <button type="button" className="btn-link w-full" onClick={onForget}>
            Forget my nook
          </button>
        )}
      </div>
    </>
  );
}
