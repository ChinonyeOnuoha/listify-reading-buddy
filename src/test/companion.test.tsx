import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Companion, type CompanionPose } from "@/components/reading/Companion";
import { BookMark } from "@/components/reading/BookMark";
import { PaperBackground } from "@/components/PaperBackground";

describe("decorative art is hidden from assistive technology", () => {
  it.each<CompanionPose>(["wave", "peek", "listen", "celebrate"])("companion (%s) is aria-hidden, unfocusable, text-free", (pose) => {
    const { container } = render(<Companion pose={pose} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("focusable")).toBe("false");
    expect(svg.textContent).toBe("");
    expect(svg.querySelector("title, desc")).toBeNull();
  });

  it("only the wave pose has an arm that can animate, and only when asked", () => {
    expect(render(<Companion pose="wave" animate />).container.querySelector(".companion-wave--animate")).not.toBeNull();
    expect(render(<Companion pose="wave" />).container.querySelector(".companion-wave--animate")).toBeNull();
    expect(render(<Companion pose="listen" animate />).container.querySelector(".companion-wave")).toBeNull();
  });

  it("logo book mark and paper background are aria-hidden", () => {
    expect(render(<BookMark />).container.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
    expect(render(<PaperBackground />).container.firstElementChild!.getAttribute("aria-hidden")).toBe("true");
  });
});
