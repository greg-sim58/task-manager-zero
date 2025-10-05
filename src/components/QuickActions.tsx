import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, UserPlus, BarChart3, Settings } from "lucide-react";

const actions = [
  {
    icon: PlusCircle,
    label: "Add Product",
    bgColor: "bg-[hsl(var(--revenue-bg))]",
    iconColor: "text-[hsl(var(--revenue-icon))]",
  },
  {
    icon: UserPlus,
    label: "Add User",
    bgColor: "bg-[hsl(var(--users-bg))]",
    iconColor: "text-[hsl(var(--users-icon))]",
  },
  {
    icon: BarChart3,
    label: "View Reports",
    bgColor: "bg-[hsl(var(--conversion-bg))]",
    iconColor: "text-[hsl(var(--conversion-icon))]",
  },
  {
    icon: Settings,
    label: "Settings",
    bgColor: "bg-[hsl(var(--orders-bg))]",
    iconColor: "text-[hsl(var(--orders-icon))]",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-24 flex-col gap-2 hover:shadow-md transition-all"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${action.bgColor}`}
              >
                <action.icon className={`h-5 w-5 ${action.iconColor}`} />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
