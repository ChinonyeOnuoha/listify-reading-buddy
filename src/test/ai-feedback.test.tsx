import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiFeedback as Panel } from "@/components/app/AiFeedback";
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
  changeChoice: vi.fn(),
  start: vi.fn(async () => {}),
  cancel: vi.fn(),
  ...over,
});

describe("AI feedback choice", () => {
  it("is asked before anything is sent, says plainly that training may happen, and needs an adult", () => {
    const ai = fake();
    render(<Panel ai={ai} hasPassage />);
    expect(screen.queryByText(/AssemblyAI may use your recording/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "About AI feedback" }));
    expect(
      screen.getByText(/AssemblyAI may use your recording to train its AI models/),
    ).toBeInTheDocument();
    expect(screen.getByText(/doesn[’']t allow switching this off/)).toBeInTheDocument();
    expect(
      screen.getByText(/only been tested on a few recordings by one reader/),
    ).toBeInTheDocument();
    expect(screen.getByText(/children[’']s corner never uses AI feedback/)).toBeInTheDocument();
    // No opt-out switch is offered, and nothing promises accents will improve or that training can be undone.
    expect(screen.queryByRole("switch")).toBeNull();
    expect(document.body.textContent).not.toMatch(
      /opt out|improve (your|its) accent|reverse|remove .* from training/i,
    );

    const use = screen.getByRole("button", { name: /Use AI feedback, knowing this/ });
    expect(use).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /18 or over/ }));
    fireEvent.click(use);
    expect(ai.choose).toHaveBeenCalledWith("ai");
    expect(ai.start).not.toHaveBeenCalled();
  });

  it("lets people keep recordings on the device, and change their mind later", () => {
    const ai = fake();
    const { rerender } = render(<Panel ai={ai} hasPassage />);
    fireEvent.click(screen.getByRole("button", { name: "About AI feedback" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep recordings on this device" }));
    expect(ai.choose).toHaveBeenCalledWith("device");
    rerender(<Panel ai={fake({ choice: "device" })} hasPassage />);
    expect(screen.getByText(/Off\. Your recordings stay on this device\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Get AI feedback/ })).toBeNull();
  });

  it("sends a recording only when asked, and names the training use next to the button", () => {
    const ai = fake({ choice: "ai" });
    render(<Panel ai={ai} hasPassage />);
    expect(
      screen.getByText("Sends this recording to AssemblyAI, which may use it to train its models."),
    ).toBeInTheDocument();
    expect(ai.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Get AI feedback on this recording" }));
    expect(ai.start).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(ai.changeChoice).toHaveBeenCalled();
  });

  it("explains a pause when the credit runs out, and recording and playback carry on", () => {
    render(
      <Panel
        ai={fake({
          choice: "ai",
          status: { available: false, paused: "credit", training: "may-be-used", maxMinutes: 20 },
        })}
        hasPassage
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      /free allowance has been used up\. Recording and playback work as usual\./,
    );
    expect(screen.queryByRole("button", { name: /Get AI feedback/ })).toBeNull();
  });

  it("needs a typed or pasted passage", () => {
    render(<Panel ai={fake({ choice: "ai" })} hasPassage={false} />);
    expect(screen.getByText(/needs the words you read/)).toBeInTheDocument();
  });

  it("shows feedback with what was over the limit behind “Show more”, not hidden", () => {
    const item = (at: number, observation: string) => ({
      kind: "omission",
      status: "difference" as const,
      words: "“x”",
      at,
      observation,
    });
    render(
      <Panel
        ai={fake({
          choice: "ai",
          run: {
            stage: "done",
            feedback: {
              items: [item(1, "first")],
              hidden: [item(2, "second")],
              notShown: 1,
              tryNext: null,
            },
          },
        })}
        hasPassage
      />,
    );
    expect(screen.getByText(/can mishear/)).toBeInTheDocument();
    expect(screen.queryByText("second")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show 1 more" }));
    expect(screen.getByText("second")).toBeInTheDocument();
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
    expect(route.match(/<AiFeedback /g)).toHaveLength(1);
    expect(route).toMatch(/useAiFeedback\(main\.rec\.take/);
  });
});
