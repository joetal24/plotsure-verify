import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RiskBadge from "@/components/RiskBadge";

describe("RiskBadge", () => {
  it("renders LOW risk level", () => {
    render(<RiskBadge level="LOW" />);
    expect(screen.getByText("LOW")).toBeInTheDocument();
  });

  it("renders MEDIUM risk level", () => {
    render(<RiskBadge level="MEDIUM" />);
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
  });

  it("renders HIGH risk level", () => {
    render(<RiskBadge level="HIGH" />);
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("renders with correct CSS classes for each level", () => {
    const { container } = render(<RiskBadge level="LOW" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-success");
  });
});
