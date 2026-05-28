import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BadgeGrid, type Badge } from "./badge-grid";

const earned: Badge = { id: "1", slug: "first-win", name: "First Win", description: "Won first challenge", criteria: "Win a challenge", iconUrl: "/badges/first-win.png", earned: true, earnedAt: "2024-01-01" };
const locked: Badge = { id: "2", slug: "streak-7", name: "7-Day Streak", description: "7 day streak", criteria: "Play 7 days in a row", iconUrl: "/badges/streak.png", earned: false };

describe("BadgeGrid", () => {
  it("renders earned badge without lock icon", () => {
    render(<BadgeGrid badges={[earned]} />);
    expect(screen.getByRole("img", { name: /First Win \(earned\)/i })).toBeTruthy();
  });

  it("renders locked badge with lock aria label", () => {
    render(<BadgeGrid badges={[locked]} />);
    expect(screen.getByRole("img", { name: /7-Day Streak \(locked\)/i })).toBeTruthy();
  });

  it("calls onNewBadge for newly earned badges", () => {
    const cb = vi.fn();
    render(<BadgeGrid badges={[earned]} previouslyEarned={[]} onNewBadge={cb} />);
    expect(cb).toHaveBeenCalledWith(earned);
  });

  it("does not call onNewBadge for previously earned badges", () => {
    const cb = vi.fn();
    render(<BadgeGrid badges={[earned]} previouslyEarned={["1"]} onNewBadge={cb} />);
    expect(cb).not.toHaveBeenCalled();
  });

  it("renders nothing when badges array is empty", () => {
    const { container } = render(<BadgeGrid badges={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
