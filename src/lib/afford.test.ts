import { describe, expect, it } from "vitest";
import { checkExplanation, decide, explain, usualDaily, type AffordInput } from "./afford";

const base: AffordInput = {
  item: "Shoes",
  priceCents: 250000,
  spendableCents: 442000,
  daysLeft: 7,
  untilLabel: "Monday's allowance",
  usualDailyCents: 17800,
  historyDays: 28,
  savingsCents: 400050,
  pendingGigCents: 210000,
};

describe("usualDaily", () => {
  it("averages over 28 days, or fewer for a new account", () => {
    expect(usualDaily(498400, 40)).toBe(17800); // 28-day window
    expect(usualDaily(100000, 10)).toBe(10000); // only 10 days of history
    expect(usualDaily(5000, 2)).toBeNull(); // too little to judge
  });
});

describe("decide: verdict rules (§7.5)", () => {
  it("yes when the daily amount after buying covers usual spending", () => {
    const r = decide(base);
    expect(r).toMatchObject({ afterCents: 192000, dailyAfterCents: 27428, verdict: "yes", reason: "covers_usual" });
  });

  it("tight between 60% and 100% of usual", () => {
    // after = 1,500 over 7 days = 214/day; usual 300 -> 71%
    const r = decide({ ...base, spendableCents: 400000, usualDailyCents: 30000 });
    expect(r).toMatchObject({ dailyAfterCents: 21428, verdict: "tight", reason: "below_usual" });
  });

  it("exactly 60% is still tight; just under is not yet", () => {
    expect(decide({ ...base, spendableCents: 250000 + 7 * 6000, usualDailyCents: 10000 }).verdict).toBe("tight");
    expect(decide({ ...base, spendableCents: 250000 + 7 * 5999, usualDailyCents: 10000 }).verdict).toBe("not_yet");
  });

  it("not yet when it costs more than what's spendable", () => {
    const r = decide({ ...base, spendableCents: 190000 });
    expect(r).toMatchObject({ afterCents: -60000, dailyAfterCents: 0, verdict: "not_yet", reason: "short" });
  });

  it("never counts savings or pending gig pay", () => {
    const r = decide({ ...base, spendableCents: 100000, savingsCents: 9_999_999, pendingGigCents: 9_999_999 });
    expect(r.verdict).toBe("not_yet");
  });

  it("says yes (with a caveat) when there's no history to compare", () => {
    expect(decide({ ...base, usualDailyCents: null, historyDays: 1 })).toMatchObject({ verdict: "yes", reason: "no_history" });
  });

  it("treats zero usual spending as room to spare, and spending it all to the peso as allowed", () => {
    expect(decide({ ...base, usualDailyCents: 0 }).verdict).toBe("yes");
    expect(decide({ ...base, spendableCents: 250000, usualDailyCents: 0 }).verdict).toBe("yes");
  });
});

describe("explain", () => {
  it("states the numbers plainly", () => {
    expect(explain(decide(base))).toBe(
      "Yes. After buying it you'd have ₱1,920 for the next 7 days, about ₱274 a day. You usually spend around ₱178 a day, so there's still room. ₱2,100 of gig pay is on the way but isn't counted until it lands.",
    );
    expect(explain(decide({ ...base, spendableCents: 190000, pendingGigCents: 0 }))).toBe(
      "Not yet. It costs ₱2,500 but you have ₱1,900 to spend, so you'd be ₱600 short until Monday's allowance.",
    );
  });

  it("passes its own check", () => {
    for (const r of [decide(base), decide({ ...base, spendableCents: 190000 }), decide({ ...base, usualDailyCents: null, historyDays: 2 })]) {
      expect(checkExplanation(explain(r), r)).toBe(true);
    }
  });
});

describe("checkExplanation", () => {
  const r = decide(base);
  it("accepts wording that only uses our numbers", () => {
    expect(checkExplanation("Yes. You'd still have ₱1,920 for 7 days, about ₱274 a day, above your usual ₱178.", r)).toBe(true);
  });
  it("rejects invented numbers, a flipped verdict, or a missing opener", () => {
    expect(checkExplanation("Yes. You'd have about ₱300 a day.", r)).toBe(false);
    expect(checkExplanation("Not yet. Save up first.", r)).toBe(false);
    expect(checkExplanation("Sure, go for it.", r)).toBe(false);
  });
});
