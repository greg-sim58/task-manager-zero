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

    // Subscribe to realtime changes for events
    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          fetchUpcomingEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      const [pendingReq, inProgressReq, completedReq] = await Promise.all([
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "completed"),
      ]);

      const pending = pendingReq.count || 0;
      const inProgress = inProgressReq.count || 0;
      const completed = completedReq.count || 0;
      const total = pending + inProgress + completed;

      const percentIncomplete = total > 0
        ? Math.round(((pending + inProgress) / total) * 100)
        : 0;

      setTaskStats({ pending, inProgress, completed, percentIncomplete });
    } catch (error) {
      console.error("Error fetching task stats:", error);
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
