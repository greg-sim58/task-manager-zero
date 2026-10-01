import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Calculator } from "lucide-react";
import {
  calculateMonthlyTax,
  AGE_BANDS,
  MONTHS_PER_YEAR,
  TAX_YEAR,
  TAX_YEAR_LABEL,
  VERIFIED_ON,
  type AgeBand,
} from "@/lib/sarsTax";
import { cn } from "@/lib/utils";

const formatZAR = (value: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(value);

const clean = (value: string) => value.replace(/[^0-9.]/g, "");

function StatRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-semibold tabular-nums", muted && "font-normal text-muted-foreground")}>
        {value}
      </dd>
    </div>
  );
}

export default function TaxTools() {
  const [monthlyInput, setMonthlyInput] = useState("");
  const [ageBand, setAgeBand] = useState<AgeBand>("under65");

  const monthlyIncome = Number(clean(monthlyInput)) || 0;
  const result = calculateMonthlyTax({ monthlyIncome, ageBand });
  const hasInput = monthlyIncome > 0;
  const monthlyThreshold = result.threshold / MONTHS_PER_YEAR;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tax Tools</h1>
        <p className="text-muted-foreground">Quick South African tax calculators</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" /> Income Tax Estimator
            </CardTitle>
            <CardDescription>
              Income tax on a monthly salary, for tax year {TAX_YEAR}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax-monthly">Monthly gross salary (ZAR)</Label>
              <Input
                id="tax-monthly"
                inputMode="decimal"
                placeholder="50000"
                value={monthlyInput}
                onChange={(e) => setMonthlyInput(clean(e.target.value))}
              />
              {hasInput && (
                <p className="text-xs text-muted-foreground">
                  Projected annual income: {formatZAR(result.annualIncome).replace(/\.00$/, "")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-age">Age group</Label>
              <Select value={ageBand} onValueChange={(value) => setAgeBand(value as AgeBand)}>
                <SelectTrigger id="tax-age">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGE_BANDS.map((band) => (
                    <SelectItem key={band.id} value={band.id}>
                      {band.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                No tax is payable on a monthly salary up to{" "}
                {formatZAR(monthlyThreshold).replace(/\.00$/, "")} for this age group.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estimated tax</CardTitle>
            <CardDescription>
              {hasInput
                ? `On ${formatZAR(monthlyIncome)} per month`
                : "Enter a monthly salary to see a breakdown"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasInput ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">Tax per month</p>
                  <p className="text-3xl font-bold tabular-nums">{formatZAR(result.monthlyTax)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {result.effectiveRate.toFixed(1)}% effective rate · {result.marginalRate}% marginal
                  </p>
                </div>

                <dl className="space-y-2 text-sm">
                  <StatRow label="Take-home per month" value={formatZAR(monthlyIncome - result.monthlyTax)} />
                  <StatRow label="Projected annual income" value={formatZAR(result.annualIncome)} muted />
                  <StatRow label="Annual tax" value={formatZAR(result.annualTax)} muted />
                  <StatRow label="Annual rebate" value={`− ${formatZAR(result.rebate)}`} muted />
                  <StatRow label="Marginal band" value={result.marginalBand} muted />
                </dl>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Results will appear here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="space-y-1">
          <p>
            <strong className="font-semibold">Estimates only.</strong> Assumes a constant monthly
            salary and excludes deductions — medical tax credits, retirement contributions,
            donations, the employment income deduction and fringe benefits. Figures are for tax
            year {TAX_YEAR} ({TAX_YEAR_LABEL}), verified against SARS on {VERIFIED_ON}; SARS
            revises rates each February, so confirm before relying on this.
          </p>
          <p>
            <strong className="font-semibold">Not a payslip figure.</strong> This annualises your
            salary and divides the resulting tax by 12. Employers instead calculate PAYE on
            year-to-date earnings and subtract tax already deducted, so your actual monthly tax
            will differ — and will change if your earnings vary from month to month.
          </p>
        </div>
      </div>
    </div>
  );
}