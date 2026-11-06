import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiFeedback as Panel, TurnOnPanel } from "@/components/app/AiFeedback";
import type { Notes } from "@/lib/reading-feedback/feedback";
import type { AiFeedback } from "@/components/app/useAiFeedback";
import { forgetChoice, loadChoice, saveChoice } from "@/lib/ai-feedback/choice";
import { FeedbackError, fetchStatus, transcribe } from "@/lib/ai-feedback/client";

afterEach(() => {
  vi.unstubAllGlobals();
  forgetChoice();
});

const fake = (over: Partial<AiFeedback> = {}): AiFeedback => ({
  configured: true,
  status: { available: true, paused: null, training: "may-be-used", maxMinutes: 20 },
  choice: null,
  run: { stage: "idle" },
  check: vi.fn(async () => {}),
  choose: vi.fn(),
  turnOff: vi.fn(),
  start: vi.fn(async () => {}),
  cancel: vi.fn(),
  ...over,
});

const NOTES: Notes = {
  version: 1,
  duration: 134,
  pace: {
    summary: "Steady at about 140 words a minute, then quicker from about 1:40.",
    bins: [0, 20, 40, 60, 80, 100, 120].map((from) => ({
      from,
      to: Math.min(134, from + 20),
      wpm: from >= 100 ? 170 : 140,
      changed: from >= 100,
    })),
    changeAt: 100,
  },
  moments: [
    { kind: "pause", at: 42, until: 44, text: "About 2 seconds in “a quiet … corner”." },
    { kind: "pause", at: 72, until: 74, text: "About 2 seconds in “a busy … afternoon”." },
    {
      kind: "skipped",
      at: 91,
      until: 95,
      text: "“who remembers your name, and a stack of stories”. A line may have been skipped.",
    },
  ],
  endsEarly: null,
  tryNext: "On your next passage, you could lightly mark the phrases before reading it aloud.",
};

function Card(p: { ai: AiFeedback; notes?: Notes | null; hasPassage?: boolean }) {
  return (
    <Panel
      ai={p.ai}
      notes={p.notes ?? null}
      hasPassage={p.hasPassage ?? true}
      onTurnOn={onTurnOn}
      onPlayFrom={onPlayFrom}
      onTurnedOff={vi.fn()}
    />
  );
}
const onTurnOn = vi.fn();
const onPlayFrom = vi.fn();

describe("turning AI feedback on", () => {
  it("asks adult, own voice and consent in one tick box, says plainly that training may happen", () => {
    const ai = fake();
    const done = vi.fn();
    render(<TurnOnPanel ai={ai} onBack={vi.fn()} onDone={done} />);
    expect(screen.getByRole("heading", { name: "Turn on AI feedback" })).toBeInTheDocument();
    expect(
      screen.getByText(/AssemblyAI may use recordings to train its AI models/),
    ).toBeInTheDocument();
    expect(screen.getByText(/doesn[’']t allow switching this off/)).toBeInTheDocument();
    expect(
      screen.getByText(/only been tested on a few recordings by one reader/),
    ).toBeInTheDocument();
    expect(screen.getByText(/children[’']s corner never uses it/)).toBeInTheDocument();
    expect(screen.getByText(/Deleting the recording deletes its notes/)).toBeInTheDocument();
    // No opt-out switch is offered, and nothing promises accents will improve or that training can be undone.
    expect(screen.queryByRole("switch")).toBeNull();
    expect(document.body.textContent).not.toMatch(
      /opt out|improve (your|its) accent|reverse|remove .* from training/i,
    );
    const turnOn = screen.getByRole("button", { name: "Turn on AI feedback" });
    expect(turnOn).toBeDisabled();
    expect(screen.getByText("Tick the box to turn it on.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /18 or over.*own voice.*I agree/ }));
    fireEvent.click(turnOn);
    expect(ai.choose).toHaveBeenCalledWith("ai");
    expect(done).toHaveBeenCalledWith(true);
    expect(ai.start).not.toHaveBeenCalled();
  });

  it("lets people keep it off", () => {
    const ai = fake();
    const done = vi.fn();
    render(<TurnOnPanel ai={ai} onBack={vi.fn()} onDone={done} />);
    fireEvent.click(screen.getByRole("button", { name: "Keep it off" }));
    expect(ai.choose).toHaveBeenCalledWith("device");
    expect(done).toHaveBeenCalledWith(false);
  });

  it("offers it on the first visit, and from the off row afterwards", () => {
    const { rerender } = render(<Card ai={fake()} />);
    fireEvent.click(screen.getByRole("button", { name: "About AI feedback" }));
    expect(onTurnOn).toHaveBeenCalledTimes(1);
    rerender(<Card ai={fake({ choice: "device" })} />);
    expect(screen.getByText("Your recordings stay on this device.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Get notes/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "AI feedback is off. Turn on" }));
    expect(onTurnOn).toHaveBeenCalledTimes(2);
  });
});

describe("AI feedback card", () => {
  it("sends a recording only when asked, and names the training use next to the button", () => {
    const ai = fake({ choice: "ai" });
    render(<Card ai={ai} />);
    expect(
      screen.getByText("Sends this recording to AssemblyAI, which may use it to train its models."),
    ).toBeInTheDocument();
    expect(ai.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Get notes on this recording" }));
    expect(ai.start).toHaveBeenCalledTimes(1);
  });

  it("changes on to off in a sheet that says what happens before confirming", () => {
    const ai = fake({ choice: "ai" });
    render(<Card ai={ai} />);
    fireEvent.click(screen.getByRole("button", { name: "AI feedback is on. Change" }));
    const sheet = screen.getByRole("dialog", { name: "AI feedback" });
    expect(within(sheet).getByRole("radio", { name: /^On/ })).toBeChecked();
    expect(within(sheet).getByRole("button", { name: "Keep it on" })).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("radio", { name: /^Off/ }));
    expect(
      within(sheet).getByText(/Notes you already have stay with their recordings/),
    ).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("button", { name: "Turn off AI feedback" }));
    expect(ai.turnOff).toHaveBeenCalled();
  });

  it("explains a pause when the credit runs out, and recording and playback carry on", () => {
    render(
      <Card
        ai={fake({
          choice: "ai",
          status: { available: false, paused: "credit", training: "may-be-used", maxMinutes: 20 },
        })}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      /free allowance has been used up\. Recording and playback work as usual\./,
    );
    expect(screen.queryByRole("button", { name: /Get notes/ })).toBeNull();
  });

  it("needs a typed or pasted passage", () => {
    render(<Card ai={fake({ choice: "ai" })} hasPassage={false} />);
    expect(screen.getByText(/needs the words you read/)).toBeInTheDocument();
  });

  it("shows pace, every moment with Play from, one thing to try and what isn't checked", () => {
    render(<Card ai={fake({ choice: "ai" })} notes={NOTES} />);
    expect(screen.getByRole("heading", { name: "Notes on this reading" })).toBeInTheDocument();
    expect(screen.getByText(/can mishear/)).toBeInTheDocument();
    expect(screen.getByText(/then quicker from about 1:40/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Words a minute in 7 parts/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "3 moments to listen to" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Play from/ })).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Play from 1:31" }));
    expect(onPlayFrom).toHaveBeenCalledWith(89.5);
    expect(screen.getByRole("heading", { name: "One thing to try" })).toBeInTheDocument();
    expect(
      screen.getByText(/Not checked: pronunciation, accent and single words/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show \d+ more/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Get notes/ })).toBeNull();
  });

  it("keeps the notes after AI feedback is turned off, and says so", () => {
    render(<Card ai={fake({ choice: "device" })} notes={NOTES} />);
    expect(
      screen.getByText(/AI feedback is off now\. These notes were made before/),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Play from/ })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "AI feedback is off. Turn on" })).toBeInTheDocument();
  });
});

describe("AI feedback choice storage", () => {
  it("remembers the choice for future recordings, and asks again if the training terms change", () => {
    expect(loadChoice("may-be-used")).toBeNull();
    saveChoice("ai", "excluded");
    expect(loadChoice("excluded")).toBe("ai");
    expect(loadChoice("may-be-used")).toBeNull();
    saveChoice("device", "may-be-used");
    expect(loadChoice("excluded")).toBe("device");
  });

  it("works without storage (nothing remembered)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadChoice("may-be-used")).toBeNull();
    vi.restoreAllMocks();
  });
});

describe("AI feedback client", () => {
  it("treats an unreachable Worker as paused, and anything but “excluded” as training use", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("offline"))),
    );
    expect(await fetchStatus()).toMatchObject({
      available: false,
      paused: "unreachable",
      training: "may-be-used",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ available: true, paused: null, training: "maybe" })),
      ),
    );
    expect((await fetchStatus()).training).toBe("may-be-used");
  });

  it("reports running out of credit as its own reason", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "credit" }), { status: 503 })),
    );
    const err = await transcribe(new Blob(["x"]), 10, new AbortController().signal).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(FeedbackError);
    expect((err as FeedbackError).reason).toBe("credit");
  });
});

describe("children's corner", () => {
  it("never uses AI feedback", () => {
    const dir = join(process.cwd(), "src/components/children");
    const banned = /ai-feedback|useAiFeedback|AiFeedback|reading-feedback/;
    for (const f of readdirSync(dir))
      expect(readFileSync(join(dir, f), "utf8"), f).not.toMatch(banned);
    // The children's review takes no feedback, and the route hands AI feedback to the main practice's review only.
    const review = readFileSync(join(process.cwd(), "src/components/app/Review.tsx"), "utf8");
    expect(review.slice(review.indexOf("export function KidReview"))).not.toMatch(
      /feedback\b|AiFeedback/,
    );
    const route = readFileSync(join(process.cwd(), "src/routes/index.tsx"), "utf8");
    expect(route.match(/<AiFeedback\s/g)).toHaveLength(1);
    expect(route).toMatch(/useAiFeedback\(main\.rec\.take/);
  });
});
