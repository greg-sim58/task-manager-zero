import { KPICard } from "@/components/KPICard";
import { RecentActivity } from "@/components/RecentActivity";
import { QuickActions } from "@/components/QuickActions";
import { TrendingUp, Users, ShoppingCart, Percent } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Revenue"
          value="$45,231"
          change="+12.5% from last month"
          icon={<TrendingUp className="h-5 w-5" />}
          variant="revenue"
        />
        <KPICard
          title="Active Users"
          value="2,345"
          change="+8.2% from last month"
          icon={<Users className="h-5 w-5" />}
          variant="users"
        />
        <KPICard
          title="Orders"
          value="1,234"
          change="-2.1% from last month"
          icon={<ShoppingCart className="h-5 w-5" />}
          variant="orders"
        />
        <KPICard
          title="Conversion Rate"
          value="3.45%"
          change="+0.5% from last month"
          icon={<Percent className="h-5 w-5" />}
          variant="conversion"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RecentActivity />
        <QuickActions />
      </div>
    </div>
  );
}
