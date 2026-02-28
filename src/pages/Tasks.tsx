import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { TaskRow, Task } from "@/components/TaskRow";
import { TaskDetailsSidebar } from "@/components/TaskDetailsSidebar";

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const rootTasks = tasks.filter((t) => !t.parent_id);
  const getSubtasks = (parentId: string) => tasks.filter((t) => t.parent_id === parentId);

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">All Tasks</h1>
      </div>

      <form onSubmit={handleCreateTask} className="relative group">
        <Input
          placeholder="Add a task... (or type naturally for AI)"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          className="h-12 pl-4 pr-12 text-base shadow-sm border-border/60 focus-visible:ring-primary/20 transition-all rounded-[var(--radius)]"
          disabled={isParsing}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isParsing ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius)] bg-accent/50 text-[10px] font-medium text-muted-foreground opacity-0 group-focus-within:opacity-100 transition-opacity">
              <Sparkles className="h-3 w-3" />
              AI Enabled
            </div>
          )}
          <Button type="submit" size="icon" variant="ghost" className="h-8 w-8 rounded-[var(--radius)]" disabled={!newTaskTitle.trim() || isParsing}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </form>

      {rootTasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-accent/50 flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No tasks yet</h3>
            <p className="text-muted-foreground max-w-[250px] mt-1">
              Start by adding a task above. Try "Grocery shopping tomorrow at 5pm"
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-1">
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
