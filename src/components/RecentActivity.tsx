import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, ShoppingBag, CreditCard } from "lucide-react";

const activities = [
  {
    icon: UserPlus,
    text: "New user registered",
    time: "2 minutes ago",
    bgColor: "bg-[hsl(var(--users-bg))]",
    iconColor: "text-[hsl(var(--users-icon))]",
  },
  {
    icon: ShoppingBag,
    text: "New order #1234",
    time: "15 minutes ago",
    bgColor: "bg-[hsl(var(--orders-bg))]",
    iconColor: "text-[hsl(var(--orders-icon))]",
  },
  {
    icon: CreditCard,
    text: "Payment received",
    time: "1 hour ago",
    bgColor: "bg-[hsl(var(--revenue-bg))]",
    iconColor: "text-[hsl(var(--revenue-icon))]",
  },
];

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-center gap-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${activity.bgColor}`}
              >
                <activity.icon className={`h-5 w-5 ${activity.iconColor}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{activity.text}</p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
