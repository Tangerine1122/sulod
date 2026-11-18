import { describe, expect, it } from "vitest";
import { bucketByDay, niceMax, periodRanges } from "./insights";

describe("periodRanges", () => {
  const wedNoon = new Date("2026-11-18T04:00:00Z"); // Wed Nov 18, noon Manila

  it("compares this week so far with last week up to the same point", () => {
    const r = periodRanges(wedNoon, "week");
    expect(r.current.from.toISOString()).toBe("2026-11-15T16:00:00.000Z"); // Mon Nov 16
    expect(r.previousSamePoint.from.toISOString()).toBe("2026-11-08T16:00:00.000Z"); // Mon Nov 9
    expect(r.previousSamePoint.to.toISOString()).toBe("2026-11-11T04:00:00.000Z"); // Wed Nov 11 noon
    expect(r.days).toBe(7);
  });

  it("compares this month so far with last month, clamped to its length", () => {
    const r = periodRanges(wedNoon, "month");
    expect(r.days).toBe(30);
    expect(r.previousSamePoint.from.toISOString()).toBe("2026-09-30T16:00:00.000Z"); // Oct 1
    expect(r.previousSamePoint.to.toISOString()).toBe("2026-10-18T04:00:00.000Z");
    const mar31 = periodRanges(new Date("2027-03-31T04:00:00Z"), "month");
    expect(mar31.previousSamePoint.to.toISOString()).toBe("2027-02-28T16:00:00.000Z"); // end of Feb
    const jan = periodRanges(new Date("2027-01-05T04:00:00Z"), "month");
    expect(jan.previousSamePoint.from.toISOString()).toBe("2026-11-30T16:00:00.000Z"); // Dec 1
  });
});

describe("bucketByDay", () => {
  it("sums by Manila day and marks today and future days", () => {
    const now = new Date("2026-11-18T04:00:00Z");
    const { current } = periodRanges(now, "week");
    const b = bucketByDay(
      [
        { amount_cents: 18000, occurred_at: "2026-11-16T11:00:00Z" }, // Mon 7 PM
        { amount_cents: 9500, occurred_at: "2026-11-16T15:59:00Z" }, // Mon 11:59 PM
        { amount_cents: 2000, occurred_at: "2026-11-16T16:01:00Z" }, // Tue 12:01 AM
      ],
      current.from,
      7,
      now,
    );
    expect(b.map((d) => d.key)).toEqual([
      "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22",
    ]);
    expect(b[0].cents).toBe(27500);
    expect(b[1].cents).toBe(2000);
    expect(b[2]).toMatchObject({ isToday: true, isFuture: false });
    expect(b[3].isFuture).toBe(true);
  });
});

describe("niceMax", () => {
  it("rounds up to a clean axis top", () => {
    expect(niceMax(34000)).toBe(50000); // ₱340 -> ₱500
    expect(niceMax(18000)).toBe(20000); // ₱180 -> ₱200
    expect(niceMax(22000)).toBe(25000); // ₱220 -> ₱250
    expect(niceMax(100000)).toBe(100000); // ₱1,000
    expect(niceMax(0)).toBe(10000);
  });
});
