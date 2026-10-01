import { describe, it, expect } from "vitest";
import {
  calculateIncomeTax,
  calculateMonthlyTax,
  MONTHS_PER_YEAR,
  TAX_BANDS,
  AGE_BANDS,
  REBATES,
  getAgeBand,
  TAX_YEAR,
  TAX_YEAR_LABEL,
  VERIFIED_ON,
  type AgeBand,
} from "./sarsTax";

describe("provenance metadata", () => {
  it("records the tax year and when the figures were verified", () => {
    expect(TAX_YEAR).toMatch(/^\d{4}\/\d{2}$/);
    expect(TAX_YEAR_LABEL).toMatch(/^\d{1,2} \w+ \d{4} – \d{1,2} \w+ \d{4}$/);
    expect(VERIFIED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("structural invariants", () => {
  it("bracket bases match tax derived from lower brackets", () => {
    // A mistyped band threshold shows up here as a base that no longer equals
    // the tax accumulated from the bands beneath it.
    TAX_BANDS.forEach((band, index) => {
      if (index === 0) {
        expect(band.base).toBe(0);
        return;
      }
      const previous = TAX_BANDS[index - 1];
      const derived = previous.base + (previous.rate / 100) * (band.floor - previous.floor);
      expect(band.base).toBeCloseTo(derived, 6);
    });
  });

  it("matches the bases published by SARS", () => {
    // Guards against the derivation being self-consistently but wrongly wrong.
    expect(TAX_BANDS.map((b) => b.base)).toEqual([
      0, 44_118, 79_998, 125_599, 185_215, 259_783, 666_339,
    ]);
  });

  it("bands are contiguous with no gaps or overlaps", () => {
    TAX_BANDS.forEach((band, index) => {
      if (index === 0) return;
      expect(band.floor).toBe(TAX_BANDS[index - 1].ceiling + 1);
    });
    expect(TAX_BANDS[0].floor).toBe(1);
    expect(TAX_BANDS[TAX_BANDS.length - 1].ceiling).toBeNull();
  });

  it("rates increase monotonically from 18% to 45%", () => {
    expect(TAX_BANDS[0].rate).toBe(18);
    expect(TAX_BANDS[TAX_BANDS.length - 1].rate).toBe(45);
    for (let i = 1; i < TAX_BANDS.length; i++) {
      expect(TAX_BANDS[i].rate).toBeGreaterThan(TAX_BANDS[i - 1].rate);
    }
  });

  it("each age band's threshold satisfies threshold * 18% == rebate", () => {
    // The identity proving rebates are deducted from tax, not from income.
    AGE_BANDS.forEach((band) => {
      expect(band.threshold * 0.18).toBeCloseTo(band.rebate, 6);
    });
  });

  it("age bands accrue rebates and thresholds in the right order", () => {
    const [under65, sixtyFive, seventyFive] = AGE_BANDS;
    expect(under65.rebate).toBe(REBATES.primary);
    expect(sixtyFive.rebate).toBe(REBATES.primary + REBATES.secondary);
    expect(seventyFive.rebate).toBe(REBATES.primary + REBATES.secondary + REBATES.tertiary);
    expect(under65.threshold).toBeLessThan(sixtyFive.threshold);
    expect(sixtyFive.threshold).toBeLessThan(seventyFive.threshold);
  });
});
describe("calculateIncomeTax", () => {
  it("charges exactly zero tax at each published threshold", () => {
    AGE_BANDS.forEach((band) => {
      expect(calculateIncomeTax({ income: band.threshold, ageBand: band.id }).tax).toBe(0);
    });
  });

  it("is continuous across every bracket boundary", () => {
    // The invariant that catches a wrong band formula: a cliff at an edge means
    // the cumulative base is not being carried forward correctly.
    //
    // The step across an edge is one rand taxed at the *higher* band's rate —
    // that rand is the first of the new band, so it attracts the new rate.
    TAX_BANDS.forEach((band, index) => {
      if (index === 0) return;
      const below = calculateIncomeTax({ income: band.floor - 1, ageBand: "under65" }).tax;
      const at = calculateIncomeTax({ income: band.floor, ageBand: "under65" }).tax;
      expect(at - below).toBeCloseTo(band.rate / 100, 6);
    });
  });

  it("never decreases as income rises", () => {
    let previous = -1;
    for (let income = 0; income <= 5_000_000; income += 2_500) {
      const { tax } = calculateIncomeTax({ income, ageBand: "under65" });
      expect(tax).toBeGreaterThanOrEqual(previous);
      previous = tax;
    }
  });

  it("matches hand-checked figures for the under-65 band", () => {
    const cases: Array<[number, number]> = [
      [150_000, 9_180],
      [250_000, 27_572],
      [400_000, 67_417],
      [600_000, 132_907],
      [800_000, 208_033],
      [1_000_000, 288_293],
      [1_500_000, 493_293],
      [2_000_000, 703_149],
    ];
    cases.forEach(([income, expected]) => {
      expect(calculateIncomeTax({ income, ageBand: "under65" }).tax).toBeCloseTo(expected, 2);
    });
  });

  it("charges older taxpayers less at the same income", () => {
    const results = (["under65", "65to74", "75plus"] as AgeBand[]).map((ageBand) =>
      calculateIncomeTax({ income: 600_000, ageBand }).tax
    );
    expect(results[0]).toBeGreaterThan(results[1]);
    expect(results[1]).toBeGreaterThan(results[2]);
  });

  it("returns zero tax for zero, negative and non-finite income", () => {
    [0, -50_000, NaN, Infinity, -Infinity].forEach((income) => {
      const result = calculateIncomeTax({ income, ageBand: "under65" });
      expect(result.tax).toBe(0);
      expect(result.effectiveRate).toBe(0);
    });
  });

  it("never returns negative tax just below the threshold", () => {
    AGE_BANDS.forEach((band) => {
      expect(calculateIncomeTax({ income: band.threshold - 1, ageBand: band.id }).tax).toBe(0);
    });
  });

  it("reports the marginal band matching the top rand of income", () => {
    expect(calculateIncomeTax({ income: 100_000, ageBand: "under65" }).marginalRate).toBe(18);
    expect(calculateIncomeTax({ income: 300_000, ageBand: "under65" }).marginalRate).toBe(26);
    expect(calculateIncomeTax({ income: 500_000, ageBand: "under65" }).marginalRate).toBe(31);
    expect(calculateIncomeTax({ income: 3_000_000, ageBand: "under65" }).marginalRate).toBe(45);
  });

  it("splits tax into base and top-band components that sum correctly", () => {
    [100_000, 300_000, 600_000, 2_500_000].forEach((income) => {
      const r = calculateIncomeTax({ income, ageBand: "under65" });
      expect(r.baseTax + r.topBandTax - r.rebate).toBeCloseTo(r.tax, 6);
    });
  });

  it("keeps the effective rate at or below the marginal rate", () => {
    for (let income = 0; income <= 3_000_000; income += 10_000) {
      const r = calculateIncomeTax({ income, ageBand: "under65" });
      expect(r.effectiveRate).toBeLessThanOrEqual(r.marginalRate + 1e-9);
    }
  });

  it("caps the effective rate below 45% for very high incomes", () => {
    const r = calculateIncomeTax({ income: 100_000_000, ageBand: "under65" });
    expect(r.effectiveRate).toBeLessThanOrEqual(45);
    expect(r.effectiveRate).toBeGreaterThan(40);
  });
});

describe("getAgeBand", () => {
  it("returns the matching band", () => {
    expect(getAgeBand("under65").id).toBe("under65");
    expect(getAgeBand("65to74").id).toBe("65to74");
    expect(getAgeBand("75plus").id).toBe("75plus");
  });

  it("falls back to the default band for an unknown id", () => {
    expect(getAgeBand("nonsense" as AgeBand).id).toBe("under65");
  });
});
describe("calculateMonthlyTax", () => {
  it("projects annual income as monthly income times twelve", () => {
    expect(calculateMonthlyTax({ monthlyIncome: 50_000, ageBand: "under65" }).annualIncome).toBe(600_000);
    expect(calculateMonthlyTax({ monthlyIncome: 12_345.67, ageBand: "under65" }).annualIncome).toBeCloseTo(
      148_148.04,
      2
    );
  });

  it("monthly tax is exactly one twelfth of the annual tax", () => {
    // The invariant that proves the rebate is being spread across the year: a
    // monthly figure derived some other way (e.g. re-applying a rebate each
    // month) breaks this.
    [5_000, 30_000, 50_000, 60_000, 100_000, 250_000].forEach((monthlyIncome) => {
      const result = calculateMonthlyTax({ monthlyIncome, ageBand: "under65" });
      expect(result.monthlyTax * MONTHS_PER_YEAR).toBeCloseTo(result.annualTax, 6);
    });
  });

  it("matches the annual calculation on the projected income", () => {
    [50_000, 60_000, 100_000].forEach((monthlyIncome) => {
      const monthly = calculateMonthlyTax({ monthlyIncome, ageBand: "under65" });
      const annual = calculateIncomeTax({ income: monthlyIncome * MONTHS_PER_YEAR, ageBand: "under65" });
      expect(monthly.annualTax).toBeCloseTo(annual.tax, 6);
    });
  });

  it("matches hand-checked figures for the under-65 band", () => {
    // Cross-checked against the annual figures already pinned in the tests above.
    const cases: Array<[number, number]> = [
      [50_000, 11_075.58],
      [60_000, 14_736.08],
      [100_000, 30_857.75],
    ];
    cases.forEach(([monthlyIncome, expected]) => {
      expect(calculateMonthlyTax({ monthlyIncome, ageBand: "under65" }).monthlyTax).toBeCloseTo(
        expected,
        2
      );
    });
  });

  it("charges no monthly tax at or below the annual threshold divided by twelve", () => {
    AGE_BANDS.forEach((band) => {
      const monthlyThreshold = band.threshold / MONTHS_PER_YEAR;
      expect(calculateMonthlyTax({ monthlyIncome: monthlyThreshold, ageBand: band.id }).monthlyTax).toBe(0);
      expect(calculateMonthlyTax({ monthlyIncome: monthlyThreshold - 1, ageBand: band.id }).monthlyTax).toBe(0);
    });
  });

  it("charges older taxpayers less at the same monthly salary", () => {
    const results = (["under65", "65to74", "75plus"] as AgeBand[]).map((ageBand) =>
      calculateMonthlyTax({ monthlyIncome: 60_000, ageBand }).monthlyTax
    );
    expect(results[0]).toBeGreaterThan(results[1]);
    expect(results[1]).toBeGreaterThan(results[2]);
  });

  it("never decreases as monthly income rises", () => {
    let previous = -1;
    for (let income = 0; income <= 1_000_000; income += 2_500) {
      const { monthlyTax } = calculateMonthlyTax({ monthlyIncome: income, ageBand: "under65" });
      expect(monthlyTax).toBeGreaterThanOrEqual(previous);
      previous = monthlyTax;
    }
  });

  it("returns zero tax for zero, negative and non-finite income", () => {
    [0, -50_000, NaN, Infinity, -Infinity].forEach((monthlyIncome) => {
      const result = calculateMonthlyTax({ monthlyIncome, ageBand: "under65" });
      expect(result.monthlyTax).toBe(0);
      expect(result.annualTax).toBe(0);
      expect(result.effectiveRate).toBe(0);
    });
  });

  it("keeps the effective rate at or below the marginal rate", () => {
    for (let income = 0; income <= 1_000_000; income += 10_000) {
      const r = calculateMonthlyTax({ monthlyIncome: income, ageBand: "under65" });
      expect(r.effectiveRate).toBeLessThanOrEqual(r.marginalRate + 1e-9);
    }
  });

  it("never deducts more than the monthly salary itself", () => {
    for (let income = 1; income <= 5_000_000; income += 25_000) {
      const { monthlyTax } = calculateMonthlyTax({ monthlyIncome: income, ageBand: "under65" });
      expect(monthlyTax).toBeLessThanOrEqual(income);
    }
  });
});