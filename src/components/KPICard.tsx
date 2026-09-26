import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change: string | ReactNode;
  icon: ReactNode;
  // Domain terms — these used to be an e-commerce template set
  // (revenue / users / orders / conversion) left over from a scaffold.
  variant: "tasks" | "done" | "due" | "overdue";
}

const variantStyles = {
  tasks: "bg-[hsl(var(--surface-1))] text-[hsl(var(--accent-1))]",
  done: "bg-[hsl(var(--surface-2))] text-[hsl(var(--accent-2))]",
  due: "bg-[hsl(var(--surface-3))] text-[hsl(var(--accent-4))]",
  overdue: "bg-destructive/10 text-destructive",
};

export function KPICard({ title, value, change, icon, variant }: KPICardProps) {
  const isString = typeof change === "string";
  const isPositive = isString && change.startsWith("+");
  const isNegative = isString && change.startsWith("-");

  return (
    <Card className="glass glass-hover group relative overflow-hidden">
      {/* Corner glow that ignites on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/20 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
      />
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              {title}
            </p>
            <p className="text-4xl font-bold tabular-nums tracking-tight">{value}</p>
            {isString ? (
              <p
                className={cn(
                  "font-mono text-xs font-medium",
                  isPositive && "text-[hsl(var(--success))]",
                  isNegative && "text-[hsl(var(--danger))]",
                  !isPositive && !isNegative && "text-muted-foreground"
                )}
              >
                {change}
              </p>
            ) : (
              <div className="text-sm font-medium">{change}</div>
            )}
          </div>
          <div
            className={cn(
              "rounded-[calc(var(--radius)-6px)] p-3 transition-transform duration-300 group-hover:scale-110",
              variantStyles[variant]
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
