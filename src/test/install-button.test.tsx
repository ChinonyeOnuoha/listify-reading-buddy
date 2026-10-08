import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InstallButton } from "@/components/reading/InstallButton";

describe("header Install app control", () => {
  it("offers the browser's install prompt when it is available", () => {
    const onInstall = vi.fn();
    render(<InstallButton canInstall ios={false} onInstall={onInstall} />);
    fireEvent.click(screen.getByRole("button", { name: "Install app" }));
    expect(onInstall).toHaveBeenCalledOnce();
  });

  it("shows the Safari Add to Home Screen steps on iOS, where there is no prompt API", () => {
    const onInstall = vi.fn();
    render(<InstallButton canInstall={false} ios onInstall={onInstall} />);
    expect(screen.queryByText(/Add to Home Screen/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Install app" }));
    expect(screen.getByText(/Add to Home Screen/)).toBeTruthy();
    expect(onInstall).not.toHaveBeenCalled();
  });

  it("renders nothing when installing isn't possible", () => {
    const { container } = render(<InstallButton canInstall={false} ios={false} onInstall={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
