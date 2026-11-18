import { describe, expect, it } from "vitest";
import { goalMath, unassignedSavings } from "./goals";

const now = new Date("2026-11-18T04:00:00Z"); // Wed Nov 18, Manila

describe("goalMath", () => {
  it("works out progress and the weekly amount to hit the date", () => {
    // ₱35,000 laptop, ₱1,000.50 saved, by Jun 30 2027 = 224 days = 32 weeks
    expect(goalMath({ target_cents: 3_500_000, saved_cents: 100_050, target_date: "2027-06-30" }, now)).toEqual({
      percent: 2,
      remainingCents: 3_399_950,
      done: false,
      weeksLeft: 32,
      weeklyCents: 106_300, // ₱1,062.48 rounded up to ₱1,063
      overdue: false,
    });
  });

  it("handles no date, done, overdue and a date this week", () => {
    expect(goalMath({ target_cents: 1_000_000, saved_cents: 300_000, target_date: null }, now)).toMatchObject({
      percent: 30,
      weeklyCents: null,
    });
    expect(goalMath({ target_cents: 500_000, saved_cents: 600_000, target_date: "2027-01-01" }, now)).toMatchObject({
      percent: 100,
      done: true,
      remainingCents: 0,
      weeklyCents: null,
    });
    expect(goalMath({ target_cents: 500_000, saved_cents: 0, target_date: "2026-11-01" }, now)).toMatchObject({ overdue: true });
    expect(goalMath({ target_cents: 500_000, saved_cents: 0, target_date: "2026-11-18" }, now)).toMatchObject({
      weeksLeft: 1,
      weeklyCents: 500_000,
    });
  });
});

describe("unassignedSavings", () => {
  it("is savings minus what goals have set aside", () => {
    expect(unassignedSavings(400_050, [{ saved_cents: 300_000 }, { saved_cents: 100_050 }])).toBe(0);
    expect(unassignedSavings(400_050, [{ saved_cents: 500_000 }])).toBe(-99_950);
  });
});
