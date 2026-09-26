import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { TaskRow, Task } from "@/components/TaskRow";
import { TaskDetailsSidebar } from "@/components/TaskDetailsSidebar";
import { Project } from "@/pages/Projects";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { format } from "date-fns";

const STATUS_LABELS: Record<Project["status"], string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

const STATUS_STYLES: Record<Project["status"], string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  on_hold: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  archived: "bg-muted text-muted-foreground border-border",
};

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchTasks();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Not found",
          description: "This project does not exist or you do not have access.",
          variant: "destructive",
        });
        navigate("/projects");
        return;
      }

      setProject(data as Project);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to load project.",
        variant: "destructive",
      });
      navigate("/projects");
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const list = (data || []) as Task[];
      setTasks(list);
      setSelectedTask((current) =>
        current ? list.find((t) => t.id === current.id) ?? null : null
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to load project tasks.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !projectId) return;

    setCreating(true);
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

      const { error } = await supabase.from("tasks").insert([
        {
          title: newTaskTitle.trim(),
          user_id: user.id,
          project_id: projectId,
          status: "todo",
          priority: "medium",
        },
      ]);

      if (error) throw error;

      setNewTaskTitle("");
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to create task.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus = task.status === "done" ? "todo" : "done";
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: nextStatus })
        .eq("id", task.id);

      if (error) throw error;
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to update task.",
        variant: "destructive",
      });
    }
  };

  const requestDeleteTask = (task?: Task) => {
    const target = task ?? selectedTask;
    if (!target) return;
    setTaskToDelete(target);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskToDelete.id);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      if (selectedTask?.id === taskToDelete.id) {
        setSidebarOpen(false);
        setSelectedTask(null);
      }
      setTaskToDelete(null);
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to delete task.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Show a task as a root when it has no parent, or its parent isn't in this project.
  // Otherwise assigned subtasks (or orphans) disappear from the project view.
  const taskIds = new Set(tasks.map((t) => t.id));
  const rootTasks = tasks.filter((t) => !t.parent_id || !taskIds.has(t.parent_id));
  const getSubtasks = (parentId: string) => tasks.filter((t) => t.parent_id === parentId);

  if (loading || !project) {
    return <div className="space-y-6">Loading project...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2 text-muted-foreground"
          onClick={() => navigate("/projects")}
        >
          <ArrowLeft className="h-4 w-4" />
          All Projects
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-3">
              <span
                className={cn("h-3.5 w-3.5 rounded-full shrink-0", project.color || "bg-primary")}
              />
              <h1 className="font-display text-4xl font-bold tracking-tight truncate">{project.name}</h1>
              <Badge
                variant="outline"
                className={cn("shrink-0 text-[10px] uppercase", STATUS_STYLES[project.status])}
              >
                {STATUS_LABELS[project.status]}
              </Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground max-w-2xl">{project.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
              </span>
              {project.due_date && (
                <span>Due {format(new Date(project.due_date), "MMM dd, yyyy")}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleCreateTask} className="relative group max-w-3xl">
        <Input
          placeholder="Add a task to this project..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          className="h-12 pl-4 pr-12"
          disabled={creating}
        />
        <button
          type="submit"
          disabled={!newTaskTitle.trim() || creating}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary disabled:opacity-30"
        >
          {creating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </form>

      {rootTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground/60">
          <p className="text-sm">No tasks in this project yet. Add one above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 max-w-3xl">
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
              onDelete={requestDeleteTask}
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
        onDelete={() => requestDeleteTask()}
      />

      <AlertDialog
        open={!!taskToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setTaskToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task</AlertDialogTitle>
            <AlertDialogDescription>
              {taskToDelete
                ? `Are you sure you want to delete “${taskToDelete.title}”? This cannot be undone.`
                : "Are you sure you want to delete this task? This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteTask();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
