/**
 * SARS income tax calculations for individuals.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SOURCE OF TRUTH — read before editing any figure in this file.
 *
 * Figures are for the SARS 2027 tax year (1 March 2026 – 28 February 2027),
 * transcribed from:
 * https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/
 * Verified on 2026-10-01.
 *
 * These change every February. When they do, update TAX_YEAR, VERIFIED_ON and
 * the tables below together, then re-run the invariant tests in sarsTax.test.ts
 * — particularly "bracket bases match tax derived from lower brackets" and "tax
 * is continuous across every bracket boundary", which are what catch a mistyped
 * figure.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const TAX_YEAR = "2026/27";
export const TAX_YEAR_LABEL = "1 March 2026 – 28 February 2027";
export const VERIFIED_ON = "2026-10-01";

/**
 * Rates of tax for individuals, applied to GROSS income.
 *
 * SARS expresses each band as: `base + rate% of the amount above the floor`,
 * where `base` is the cumulative tax owed on all income below the band.
 *
 * The formula is `base + rate * (income - (floor - 1))`. It is NOT
 * `base + rate * income`, which compounds tax across every band and yields
 * badly wrong numbers.
 *
 * `base` is derived rather than hand-typed so it cannot drift out of step with
 * the bands above it — see `buildBands()`.
 */
interface RawBand {
  /** Lowest rand of gross income falling in this band. */
  floor: number;
  /** Marginal rate as a percentage, e.g. 18 for 18%. */
  rate: number;
  /** Highest rand of gross income in this band; null for the open top band. */
  ceiling: number | null;
}

const RAW_BANDS: RawBand[] = [
  { floor: 1, rate: 18, ceiling: 245_100 },
  { floor: 245_101, rate: 26, ceiling: 383_100 },
  { floor: 383_101, rate: 31, ceiling: 530_200 },
  { floor: 530_201, rate: 36, ceiling: 695_800 },
  { floor: 695_801, rate: 39, ceiling: 887_000 },
  { floor: 887_001, rate: 41, ceiling: 1_878_600 },
  { floor: 1_878_601, rate: 45, ceiling: null },
];

export interface TaxBand extends RawBand {
  /** Tax due on gross income at this band's floor, in rand. */
  base: number;
  /** Human-readable range, e.g. "R1 – R245,100". */
  label: string;
}

const rand = (value: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(value);

/**
 * Derives each band's cumulative base from the band below it.
 *
 * The base cannot be read from `RAW_BANDS` (which carries no `base` field), so
 * bands are accumulated into `TAX_BANDS_REF` as they are produced. That way a
 * mistyped threshold can never produce a stale or hand-copied base — the value
 * is always recomputed from the bands beneath it.
 */
const TAX_BANDS_REF: TaxBand[] = [];

export const TAX_BANDS: TaxBand[] = RAW_BANDS.map((band, index) => {
  const previous = TAX_BANDS_REF[index - 1];
  const base =
    index === 0 ? 0 : previous.base + (previous.rate / 100) * (band.floor - previous.floor);
  const built: TaxBand = {
    ...band,
    base,
    label: `${rand(band.floor)} – ${band.ceiling === null ? "and above" : rand(band.ceiling)}`,
  };
  TAX_BANDS_REF.push(built);
  return built;
});

/** Tax rebates, deducted from tax owed (not from income). */
export const REBATES = {
  primary: 17_820,
  secondary: 9_765,
  tertiary: 3_249,
} as const;
export type AgeBand = "under65" | "65to74" | "75plus";

export interface AgeBandOption {
  id: AgeBand;
  label: string;
  /** Total rebate available to this age group, in rand. */
  rebate: number;
  /** Gross income below which no tax is payable, in rand. */
  threshold: number;
}

/**
 * Age bands. The secondary rebate applies from 65 and the tertiary from 75, so
 * each band's total rebate is the primary plus whichever extras apply.
 *
 * Each threshold satisfies `threshold * 18% == total rebate` — the arithmetic
 * that proves the band is internally consistent, asserted in the tests.
 */
export const AGE_BANDS: AgeBandOption[] = [
  {
    id: "under65",
    label: "Under 65",
    rebate: REBATES.primary,
    threshold: 99_000,
  },
  {
    id: "65to74",
    label: "65 – 74",
    rebate: REBATES.primary + REBATES.secondary,
    threshold: 153_250,
  },
  {
    id: "75plus",
    label: "75 and older",
    rebate: REBATES.primary + REBATES.secondary + REBATES.tertiary,
    threshold: 171_300,
  },
];

export const getAgeBand = (id: AgeBand): AgeBandOption =>
  AGE_BANDS.find((band) => band.id === id) ?? AGE_BANDS[0];

export interface IncomeTaxInput {
  /** Annual gross employment income, in rand. */
  income: number;
  /** Age group, which determines the rebate and threshold. */
  ageBand: AgeBand;
}

export interface IncomeTaxResult {
  /** Tax payable for the year, in rand. Never negative. */
  tax: number;
  /** Tax as a percentage of gross income. */
  effectiveRate: number;
  /** Rate of the band the top rand of income falls in, as a percentage. */
  marginalRate: number;
  /** Description of that band, e.g. "R245,101 – R383,100". */
  marginalBand: string;
  /** Rebate deducted, in rand. */
  rebate: number;
  /** Gross income below which no tax is payable for this age band. */
  threshold: number;
  /** Tax on income below the top band, at lower marginal rates. */
  baseTax: number;
  /** Tax on the portion of income inside the top band. */
  topBandTax: number;
}

/**
 * Computes annual income tax for an individual.
 *
 * Scope: employment income only, with no deductions. Excludes medical tax
 * credits, retirement contributions, donations, the employment income deduction,
 * fringe benefits, capital gains and provisional tax — each needs its own
 * separately verified tables, so none are applied here.
 */
export function calculateIncomeTax({
  income,
  ageBand,
}: IncomeTaxInput): IncomeTaxResult {
  const { rebate, threshold } = getAgeBand(ageBand);
  const gross = Number.isFinite(income) && income > 0 ? income : 0;

  const band =
    TAX_BANDS.find((b) => gross >= b.floor && (b.ceiling === null || gross <= b.ceiling)) ??
    TAX_BANDS[0];

  // Cumulative tax on all income below this band.
  const baseTax = band.base;
  // Tax on the portion of income that falls inside this band.
  const topBandTax = (gross - (band.floor - 1)) * (band.rate / 100);
  const tax = Math.max(0, baseTax + topBandTax - rebate);

  return {
    tax,
    effectiveRate: gross > 0 ? (tax / gross) * 100 : 0,
    marginalRate: band.rate,
    marginalBand: band.label,
    rebate,
    threshold,
    baseTax,
    topBandTax,
  };
}
/** Months in a tax year. Named because the monthly calculation depends on it. */
export const MONTHS_PER_YEAR = 12;

export interface MonthlyTaxInput {
  /** Gross salary for one month, in rand. */
  monthlyIncome: number;
  /** Age group, which determines the rebate and threshold. */
  ageBand: AgeBand;
}

export interface MonthlyTaxResult {
  /** Gross salary for one month, as entered. */
  monthlyIncome: number;
  /** Annual income projected from that salary. */
  annualIncome: number;
  /** Tax payable for one month, in rand. Never negative. */
  monthlyTax: number;
  /** Annual tax on the projected income. Exactly 12x `monthlyTax`. */
  annualTax: number;
  /** Monthly tax as a percentage of monthly gross income. */
  effectiveRate: number;
  /** Rate of the band the top rand of annual income falls in, as a percentage. */
  marginalRate: number;
  /** Description of that band, e.g. "R530,201 – R695,800". */
  marginalBand: string;
  /** Annual rebate, applied once for the year then spread across 12 months. */
  rebate: number;
  /** Annual income below which no tax is payable for this age band. */
  threshold: number;
}

/**
 * Estimates the income tax payable on one month's salary.
 *
 * Method: project the annual income as `monthlyIncome * 12`, apply the annual
 * brackets, then divide the resulting annual tax by 12.
 *
 * This is a SIMPLIFICATION, and it is deliberately not the same as PAYE. SARS
 * employers calculate PAYE on year-to-date earnings and subtract tax already
 * paid, so a real payslip can differ from this figure — and will differ whenever
 * earnings vary between months. This tool assumes a constant monthly salary;
 * it has no way to know what was earned or deducted in other months.
 *
 * Note that dividing the final annual tax by 12 also spreads the annual rebate
 * across the year. An employer applies the rebate once for the year, so their
 * monthly figure is typically lower in most months than this estimate.
 *
 * For the authoritative treatment of fluctuating income, see the SARS tax
 * deduction tables and a payroll provider's method notes.
 */
export function calculateMonthlyTax({
  monthlyIncome,
  ageBand,
}: MonthlyTaxInput): MonthlyTaxResult {
  const gross = Number.isFinite(monthlyIncome) && monthlyIncome > 0 ? monthlyIncome : 0;
  const annualIncome = gross * MONTHS_PER_YEAR;
  const annual = calculateIncomeTax({ income: annualIncome, ageBand });

  return {
    monthlyIncome: gross,
    annualIncome,
    monthlyTax: annual.tax / MONTHS_PER_YEAR,
    annualTax: annual.tax,
    effectiveRate: gross > 0 ? (annual.tax / annualIncome) * 100 : 0,
    marginalRate: annual.marginalRate,
    marginalBand: annual.marginalBand,
    rebate: annual.rebate,
    threshold: annual.threshold,
  };
}