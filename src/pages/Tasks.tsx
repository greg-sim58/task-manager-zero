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

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks((data || []) as Task[]);
    } catch (error: any) {
      logError("Tasks.fetch", error);
      toast({
        title: "Error",
        description: "Unable to load tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = taskSchema.safeParse(formData);
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create tasks",
          variant: "destructive",
        });
        return;
      }

      const taskData = {
        ...formData,
        user_id: user.id,
        due_date: formData.due_date || null,
      };

      if (editingTask) {
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", editingTask.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      } else {
        const { error } = await supabase.from("tasks").insert([taskData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Task created successfully",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error: any) {
      logError("Tasks.save", error);
      toast({
        title: "Error",
        description: "Unable to save task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });

      fetchTasks();
    } catch (error: any) {
      logError("Tasks.delete", error);
      toast({
        title: "Error",
        description: "Unable to delete task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      status: task.status as "todo" | "in_progress" | "done",
      priority: task.priority as "low" | "medium" | "high",
      due_date: task.due_date ? task.due_date.split("T")[0] : "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTask(null);
    setFormData({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      due_date: "",
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
    return <div className="space-y-6">Loading tasks...</div>;
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
