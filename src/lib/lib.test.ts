import { describe, expect, it } from "vitest";
import { formatPeso, parsePesoToCents, splitPeso } from "./money";
import { manilaDayKey, manilaMonthKey, manilaMonthRange, manilaParts, manilaWeekRange, shiftMonth } from "./dates";
import { daysUntilAllowance, safeToSpend } from "./safe-to-spend";
import { textOn } from "./color";
import { roughParse } from "./rough-parse";

describe("money", () => {
  it("formats centavos as pesos", () => {
    expect(formatPeso(18000)).toBe("₱180.00");
    expect(formatPeso(842050)).toBe("₱8,420.50");
    expect(formatPeso(-9500)).toBe("−₱95.00");
    expect(formatPeso(124599, { whole: true })).toBe("₱1,245");
  });

  it("splits for the big balance number", () => {
    expect(splitPeso(842050)).toEqual({ sign: "", whole: "8,420", fraction: "50" });
    expect(splitPeso(5)).toEqual({ sign: "", whole: "0", fraction: "05" });
  });

  it("parses typed amounts", () => {
    expect(parsePesoToCents("180")).toBe(18000);
    expect(parsePesoToCents("180.5")).toBe(18050);
    expect(parsePesoToCents("₱1,200.75")).toBe(120075);
    expect(parsePesoToCents("0")).toBeNull();
    expect(parsePesoToCents("12.345")).toBeNull();
    expect(parsePesoToCents("abc")).toBeNull();
    expect(parsePesoToCents("-5")).toBeNull();
  });
});

describe("dates", () => {
  it("uses the Manila calendar day, not UTC", () => {
    // 2026-11-16 23:30 Manila = 15:30 UTC (a Monday in Manila)
    const lateMonday = new Date("2026-11-16T15:30:00Z");
    expect(manilaParts(lateMonday)).toMatchObject({ y: 2026, m: 11, d: 16, weekday: 1 });
    // 2026-11-17 00:30 Manila = 2026-11-16 16:30 UTC (already Tuesday in Manila)
    expect(manilaParts(new Date("2026-11-16T16:30:00Z")).weekday).toBe(2);
  });

  it("weeks start Monday 00:00 Manila", () => {
    const wed = new Date("2026-11-18T04:00:00Z"); // Wed noon Manila
    const { from, to } = manilaWeekRange(wed);
    expect(from.toISOString()).toBe("2026-11-15T16:00:00.000Z"); // Mon Nov 16 00:00 Manila
    expect(to.toISOString()).toBe("2026-11-22T16:00:00.000Z");
    expect(manilaWeekRange(wed, 1).from.toISOString()).toBe("2026-11-08T16:00:00.000Z");
  });
});

describe("safe to spend", () => {
  const monday = new Date("2026-11-16T04:00:00Z"); // Mon noon Manila
  const friday = new Date("2026-11-20T04:00:00Z"); // Fri noon Manila

  it("counts days until the next allowance day", () => {
    expect(daysUntilAllowance(monday, 1)).toBe(7); // allowance day itself -> a full week
    expect(daysUntilAllowance(friday, 1)).toBe(3); // Fri, Sat, Sun
    expect(daysUntilAllowance(friday, 6)).toBe(1); // only today
  });

  it("divides spendable money and ignores savings", () => {
    const wallets = [
      { balance_cents: 64000, counts_as_spendable: true },
      { balance_cents: 178000, counts_as_spendable: true },
      { balance_cents: 200000, counts_as_spendable: true },
      { balance_cents: 400050, counts_as_spendable: false },
    ];
    expect(safeToSpend(wallets, 1, monday)).toEqual({
      spendableCents: 442000,
      daysLeft: 7,
      safeTodayCents: 63142,
    });
  });

  it("never goes negative", () => {
    expect(safeToSpend([{ balance_cents: -5000, counts_as_spendable: true }], 1, friday).safeTodayCents).toBe(0);
  });
});


describe("textOn", () => {
  it("uses white on dark chips and ink on light ones", () => {
    expect(textOn("#0E5A57")).toBe("#ffffff");
    expect(textOn("#C4421A")).toBe("#ffffff");
    expect(textOn("#F2B33D")).toBe("#1e1a16");
    expect(textOn("#CFC5B8")).toBe("#1e1a16");
  });
});

describe("roughParse (stand-in until AI quick-add)", () => {
  it("pulls the amount out and keeps the rest as the merchant", () => {
    expect(roughParse("jollibee 180")).toEqual({ merchant: "jollibee", amount: "180" });
    expect(roughParse("grab to uni 95.50")).toEqual({ merchant: "grab to uni", amount: "95.50" });
    expect(roughParse("₱1,200 tuition")).toEqual({ merchant: "tuition", amount: "1,200" });
    expect(roughParse("7-eleven 85")).toEqual({ merchant: "7-eleven", amount: "85" });
    expect(roughParse("grab 2 uni 95")).toEqual({ merchant: "grab 2 uni", amount: "95" });
    expect(roughParse("load")).toEqual({ merchant: "load", amount: "" });
    expect(roughParse("")).toEqual({ merchant: "", amount: "" });
  });
});


describe("month helpers", () => {
  it("uses Manila months", () => {
    // Nov 30 23:30 Manila is still November there, though it's Nov 30 15:30 UTC
    expect(manilaMonthKey(new Date("2026-11-30T15:30:00Z"))).toBe("2026-11");
    // Dec 1 00:30 Manila is Nov 30 16:30 UTC but December in Manila
    expect(manilaMonthKey(new Date("2026-11-30T16:30:00Z"))).toBe("2026-12");
    expect(manilaDayKey("2026-11-30T16:30:00Z")).toBe("2026-12-01");
  });

  it("gives month ranges and shifts across years", () => {
    const { from, to } = manilaMonthRange("2026-12");
    expect(from.toISOString()).toBe("2026-11-30T16:00:00.000Z");
    expect(to.toISOString()).toBe("2026-12-31T16:00:00.000Z");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
  });
});
