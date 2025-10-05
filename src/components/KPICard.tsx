import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  icon: ReactNode;
  variant: "revenue" | "users" | "orders" | "conversion";
}

const variantStyles = {
  revenue: "bg-[hsl(var(--revenue-bg))] text-[hsl(var(--revenue-icon))]",
  users: "bg-[hsl(var(--users-bg))] text-[hsl(var(--users-icon))]",
  orders: "bg-[hsl(var(--orders-bg))] text-[hsl(var(--orders-icon))]",
  conversion: "bg-[hsl(var(--conversion-bg))] text-[hsl(var(--conversion-icon))]",
};

export function KPICard({ title, value, change, icon, variant }: KPICardProps) {
  const isPositive = change.startsWith("+");
  const isNegative = change.startsWith("-");

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <p
              className={cn(
                "text-sm font-medium",
                isPositive && "text-[hsl(var(--success))]",
                isNegative && "text-[hsl(var(--danger))]",
                !isPositive && !isNegative && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          </div>
          <div className={cn("rounded-full p-3", variantStyles[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
