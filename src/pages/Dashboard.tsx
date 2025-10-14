import { useEffect, useState } from "react";
import { KPICard } from "@/components/KPICard";
import { RecentActivity } from "@/components/RecentActivity";
import { QuickActions } from "@/components/QuickActions";
import { CheckSquare, Calendar as CalendarIcon, ShoppingCart, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function Dashboard() {
  const [taskStats, setTaskStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    percentIncomplete: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState<{ usd: number; eur: number }>({
    usd: 0,
    eur: 0,
  });

  useEffect(() => {
    fetchTasks();
    fetchUpcomingEvents();
    fetchExchangeRates();
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

  const fetchUpcomingEvents = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: events } = await supabase
      .from("events")
      .select("title, date, time")
      .gte("date", today.toISOString())
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      .limit(3);

    if (events) {
      setUpcomingEvents(events);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      const response = await fetch("https://api.exchangerate-api.com/v4/latest/ZAR");
      const data = await response.json();
      if (data.rates) {
        setExchangeRates({
          usd: Number((1 / data.rates.USD).toFixed(2)),
          eur: Number((1 / data.rates.EUR).toFixed(2)),
        });
      }
    } catch (error) {
      console.error("Failed to fetch exchange rates:", error);
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
          title="Events"
          value={`${upcomingEvents.length}`}
          change={
            upcomingEvents.length > 0 ? (
              <div className="space-y-1">
                {upcomingEvents.map((event, idx) => (
                  <div key={idx} className="text-xs">
                    {event.title} - {format(new Date(event.date), "MMM d")} at {event.time}
                  </div>
                ))}
              </div>
            ) : (
              "No upcoming events"
            )
          }
          icon={<CalendarIcon className="h-5 w-5" />}
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
          value="ZAR"
          change={
            exchangeRates.usd > 0 ? (
              <div className="space-y-1">
                <div className="text-xs">$: R{exchangeRates.usd}</div>
                <div className="text-xs">€: R{exchangeRates.eur}</div>
              </div>
            ) : (
              "Loading rates..."
            )
          }
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
