import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Sparkles,
  Loader2,
  Calendar,
  List,
  Send
} from "lucide-react";
import { TaskRow, Task } from "@/components/TaskRow";
import { TaskDetailsSidebar } from "@/components/TaskDetailsSidebar";

import { isToday, isAfter, parseISO, startOfToday } from "date-fns";
import { cn } from "@/lib/utils";

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<'Today' | 'Upcoming' | 'All Tasks' | 'AI Insights'>('Today');

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks((data || []) as Task[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsParsing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create tasks",
          variant: "destructive",
        });
        return;
      }

      // Check if it's natural language and might need parsing
      const needsParsing = newTaskTitle.match(/(by|tomorrow|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|priority|urgent)/i);

      let taskData: Partial<Task> = {
        title: newTaskTitle,
        user_id: user.id as any,
        status: "todo",
        priority: "medium",
      };

      if (needsParsing) {
        const { data: parsedData, error: parseError } = await supabase.functions.invoke("ai-parse-task", {
          body: { text: newTaskTitle },
        });

        if (!parseError && parsedData) {
          taskData = {
            ...taskData,
            title: parsedData.title || newTaskTitle,
            due_date: parsedData.due_date || null,
            priority: parsedData.priority || "medium",
          };
          toast({
            title: "AI Parsed Task",
            description: `Auto-set due date and priority`,
          });
        }
      }

      const { data, error } = await supabase.from("tasks").insert([taskData as any]).select().single();
      if (error) throw error;

      setNewTaskTitle("");
      fetchTasks();
      if (data) {
        setSelectedTask(data as Task);
        setSidebarOpen(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id);

      if (error) throw error;
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", selectedTask.id);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      setSidebarOpen(false);
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const filteredTasks = useMemo(() => {
    const today = startOfToday();
    return tasks.filter((task) => {
      if (activeFilter === 'Today') {
        return task.due_date && isToday(parseISO(task.due_date));
      }
      if (activeFilter === 'Upcoming') {
        return task.due_date && isAfter(parseISO(task.due_date), today) && !isToday(parseISO(task.due_date));
      }
      return true; // All Tasks and AI Insights
    });
  }, [tasks, activeFilter]);

  const rootTasks = filteredTasks.filter((t) => !t.parent_id);
  const getSubtasks = (parentId: string) => tasks.filter((t) => t.parent_id === parentId);

  const navigationItems = [
    { title: "Today", icon: Calendar, color: "bg-blue-600 text-white" },
    { title: "Upcoming", icon: Calendar, color: "hover:bg-accent/50" },
    { title: "All Tasks", icon: List, color: "hover:bg-accent/50" },
    { title: "AI Insights", icon: Sparkles, color: "hover:bg-accent/50" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex -m-6 h-[calc(100vh-64px)] overflow-hidden">
      {/* Page-level Sidebar / Navigation */}
      <aside className="w-64 border-r border-border/40 flex flex-col p-4 pt-6 bg-background/50 backdrop-blur-sm">
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <button
              key={item.title}
              onClick={() => setActiveFilter(item.title as any)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                activeFilter === item.title
                  ? (item.title === "Today" ? "bg-[#5D5FEF] text-white shadow-sm" : "bg-accent/80 text-foreground")
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", activeFilter === item.title ? "text-inherit" : "text-muted-foreground group-hover:text-foreground")} />
              {item.title}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-8 py-8 space-y-8 bg-background">
        <div className="w-full space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold tracking-tight">{activeFilter}</h1>
          </div>

          <form onSubmit={handleCreateTask} className="relative group">
            <Input
              placeholder="Add a task... (or type naturally for AI)"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="h-14 pl-5 pr-24 text-base shadow-sm border-border/40 focus-visible:ring-primary/20 transition-all rounded-xl"
              disabled={isParsing}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-4">
              {isParsing ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <div className="flex items-center gap-4 text-muted-foreground/40 group-focus-within:text-muted-foreground/80 transition-colors">
                  <button type="button" className="hover:text-primary transition-colors">
                    <Sparkles className="h-5 w-5" />
                  </button>
                  <button type="submit" disabled={!newTaskTitle.trim() || isParsing} className="hover:text-primary transition-colors disabled:opacity-30">
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </form>

          {rootTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center text-muted-foreground/60">
              <p className="text-sm">No tasks yet. Add one above to get started.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 pr-4">
              {rootTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  subtasks={getSubtasks(task.id)}
                  onToggleStatus={handleToggleStatus}
                  onSelectTask={(t) => {
                    setSelectedTask(t);
                    setSidebarOpen(true);
                  }}
                  isExpanded={expandedTasks.has(task.id)}
                  onToggleExpand={() => toggleExpand(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <TaskDetailsSidebar
        task={selectedTask}
        isOpen={sidebarOpen}
        onClose={() => {
          setSidebarOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={fetchTasks}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
