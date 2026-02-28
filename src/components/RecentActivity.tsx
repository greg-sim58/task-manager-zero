import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type Task = {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
};

type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
};

export function RecentActivity() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetchPendingTasks();
    fetchUpcomingEvents();
  }, []);

  const fetchPendingTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, due_date, priority")
      .eq("status", "todo")
      .order("priority", { ascending: true })
      .limit(6);

    if (data) {
      // Sort by priority: high, medium, low
      const sortedData = data.sort((a, b) => {
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      });
      setTasks(sortedData);
    }
  };

  const fetchUpcomingEvents = async () => {
    /*
    const today = new Date();

    const { data } = await supabase
      .from("events")
      .select("id, title, date, time")
      .gte("date", today.toISOString())
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      .limit(6);

    if (data) {
      setEvents(data);
    }
    */
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Todo Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {tasks.length === 0 && events.length === 0 && (
            <p className="text-sm text-muted-foreground">No todo tasks</p>
          )}

          {tasks.map((task) => (
            <div key={`task-${task.id}`} className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--warning-bg))]">
                <CheckSquare className="h-5 w-5 text-[hsl(var(--warning))]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  Due: {task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "No due date"}
                </p>
              </div>
            </div>
          ))}

          {events.map((event) => (
            <div key={`event-${event.id}`} className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--users-bg))]">
                <CalendarIcon className="h-5 w-5 text-[hsl(var(--users-icon))]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(event.date), "MMM d, yyyy")} at {event.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
