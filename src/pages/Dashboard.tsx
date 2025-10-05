import { useEffect, useState } from "react";
import { KPICard } from "@/components/KPICard";
import { RecentActivity } from "@/components/RecentActivity";
import { QuickActions } from "@/components/QuickActions";
import { CheckSquare, Users, ShoppingCart, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [taskStats, setTaskStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    percentIncomplete: 0,
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("status");

    if (tasks) {
      const pending = tasks.filter((t) => t.status === "pending").length;
      const inProgress = tasks.filter((t) => t.status === "in_progress").length;
      const completed = tasks.filter((t) => t.status === "completed").length;
      const total = tasks.length;
      const percentIncomplete = total > 0 
        ? Math.round(((pending + inProgress) / total) * 100) 
        : 0;

      setTaskStats({ pending, inProgress, completed, percentIncomplete });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Tasks"
          value={`${taskStats.percentIncomplete}%`}
          change={
            <div className="space-y-1">
              <div className="text-[hsl(var(--warning))]">{taskStats.pending} pending</div>
              <div className="text-[hsl(var(--primary))]">{taskStats.inProgress} in progress</div>
              <div className="text-[hsl(var(--success))]">{taskStats.completed} completed</div>
            </div>
          }
          icon={<CheckSquare className="h-5 w-5" />}
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
