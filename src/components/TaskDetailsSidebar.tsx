import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Sparkles, Loader2, Calendar as CalendarIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Task } from "./TaskRow";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface ProjectOption {
    id: string;
    name: string;
}

interface TaskDetailsSidebarProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    onDelete: () => void;
}

export function TaskDetailsSidebar({
    task,
    isOpen,
    onClose,
    onUpdate,
    onDelete,
}: TaskDetailsSidebarProps) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        status: "todo" as Task["status"],
        priority: "medium" as Task["priority"],
        due_date: "",
        project_id: "" as string,
    });
    const [subtasks, setSubtasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [isBreakingDown, setIsBreakingDown] = useState(false);

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title,
                description: task.description || "",
                status: task.status,
                priority: task.priority,
                due_date: task.due_date ? task.due_date.slice(0, 10) : "",
                project_id: task.project_id || "",
            });
            fetchSubtasks();
            fetchProjects();
        }
    }, [task]);

    const fetchProjects = async () => {
        const { data, error } = await supabase
            .from("projects")
            .select("id, name")
            .order("name", { ascending: true });

        if (error) {
            console.error("Error fetching projects:", error);
        } else {
            setProjects(data || []);
        }
    };

    const fetchSubtasks = async () => {
        if (!task) return;
        const { data, error } = await supabase
            .from("tasks")
            .select("*")
            .eq("parent_id", task.id)
            .order("position", { ascending: true });

        if (error) {
            console.error("Error fetching subtasks:", error);
        } else {
            setSubtasks((data || []) as Task[]);
        }
    };

    const handleSave = async () => {
        if (!task) return;
        setIsUpdating(true);
        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                status: formData.status,
                priority: formData.priority,
                due_date: formData.due_date || null,
                project_id: formData.project_id || null,
            };

            const { data, error } = await supabase
                .from("tasks")
                .update(payload)
                .eq("id", task.id)
                .select("id, project_id")
                .maybeSingle();

            if (error) throw error;
            if (!data) {
                throw new Error("Task was not updated. You may not have permission to edit it.");
            }

            toast({
                title: "Success",
                description: formData.project_id
                    ? "Task updated and assigned to project"
                    : "Task updated successfully",
            });
            onUpdate();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteSubtask = async (id: string) => {
        try {
            const { error } = await supabase.from("tasks").delete().eq("id", id);
            if (error) throw error;
            fetchSubtasks();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleAddSubtask = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!task || !newSubtaskTitle.trim()) return;

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase.from("tasks").insert([
                {
                    title: newSubtaskTitle,
                    parent_id: task.id,
                    user_id: user.id,
                    status: "todo",
                    priority: "medium",
                    position: subtasks.length,
                },
            ]);

            if (error) throw error;

            setNewSubtaskTitle("");
            fetchSubtasks();
            onUpdate();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleBreakDown = async () => {
        if (!task) return;
        setIsBreakingDown(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await supabase.functions.invoke("ai-breakdown", {
                body: { title: formData.title, description: formData.description },
            });

            if (error) throw error;

            if (data.subtasks && Array.isArray(data.subtasks)) {
                const subtasksToInsert = data.subtasks.map((st: any, index: number) => ({
                    title: st.title,
                    description: st.description,
                    priority: st.priority || "medium",
                    status: "todo",
                    parent_id: task.id,
                    user_id: user.id,
                    position: subtasks.length + index,
                    ai_generated: true,
                }));

                const { error: insertError } = await supabase.from("tasks").insert(subtasksToInsert);
                if (insertError) throw insertError;

                toast({
                    title: "AI Breakdown Complete",
                    description: `Generated ${data.subtasks.length} subtasks`,
                });
                fetchSubtasks();
                onUpdate();
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsBreakingDown(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="sm:max-w-[400px] p-0 flex flex-col">
                <div className="flex items-center justify-between p-6 pb-2">
                    <h2 className="text-xl font-bold">Task Details</h2>
                </div>

                <div className="flex-1 overflow-y-auto px-6 space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm font-medium text-muted-foreground">Title</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="font-medium bg-muted/30 border-none focus-visible:ring-1"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium text-muted-foreground">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                            placeholder="Add description..."
                            className="bg-muted/30 border-none focus-visible:ring-1 resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                        <div className="relative">
                            <Input
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                className="bg-muted/30 border-none focus-visible:ring-1 pr-10"
                            />
                            <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                        <ToggleGroup
                            type="single"
                            value={formData.priority}
                            onValueChange={(value: any) => value && setFormData({ ...formData, priority: value })}
                            className="justify-start gap-2"
                        >
                            <ToggleGroupItem value="low" className="h-8 px-4 text-xs font-medium rounded-md transition-all data-[state=on]:bg-amber-50 data-[state=on]:text-amber-700 data-[state=on]:border-amber-200 border border-transparent">Low</ToggleGroupItem>
                            <ToggleGroupItem value="medium" className="h-8 px-4 text-xs font-medium rounded-md transition-all data-[state=on]:bg-orange-50 data-[state=on]:text-orange-700 data-[state=on]:border-orange-200 border border-transparent">Medium</ToggleGroupItem>
                            <ToggleGroupItem value="high" className="h-8 px-4 text-xs font-medium rounded-md transition-all data-[state=on]:bg-red-50 data-[state=on]:text-red-700 data-[state=on]:border-red-200 border border-transparent">High</ToggleGroupItem>
                        </ToggleGroup>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                        >
                            <SelectTrigger className="bg-muted/30 border-none focus:ring-1 h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Project</Label>
                        <Select
                            value={formData.project_id || "none"}
                            onValueChange={(value) =>
                                setFormData({
                                    ...formData,
                                    project_id: value === "none" ? "" : value,
                                })
                            }
                        >
                            <SelectTrigger className="bg-muted/30 border-none focus:ring-1 h-10">
                                <SelectValue placeholder="No project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No project</SelectItem>
                                {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="pt-4 space-y-4 pb-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Subtasks</Label>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 text-[10px] font-bold rounded-[var(--radius)] px-3 border-muted-foreground/20 text-muted-foreground hover:bg-accent"
                                onClick={handleBreakDown}
                                disabled={isBreakingDown}
                            >
                                {isBreakingDown ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Sparkles className="h-3 w-3" />
                                )}
                                Break Down with AI
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 pt-1 border rounded-md px-2 py-1 focus-within:ring-1 bg-white">
                                <input
                                    placeholder="Add subtask..."
                                    value={newSubtaskTitle}
                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                    className="flex-1 h-8 text-sm outline-none bg-transparent"
                                    onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddSubtask}
                                    className="h-7 w-7 flex-shrink-0 bg-[#353535] text-white rounded-full flex items-center justify-center hover:bg-black transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                            {subtasks.map((st) => (
                                <div key={st.id} className="group flex items-center justify-between py-1 px-2 hover:bg-accent/30 rounded-md transition-colors text-sm">
                                    <span className={cn(st.status === "done" && "text-muted-foreground line-through")}>{st.title}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDeleteSubtask(st.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t bg-background mt-auto flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        className="flex-shrink-0 h-11 w-11 rounded-[var(--radius)] border-destructive/20 text-destructive hover:bg-destructive/5"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-5 w-5" />
                    </Button>
                    <Button
                        className="flex-1 h-11 rounded-[var(--radius)] bg-[#616AE3] hover:bg-[#4F59D1] text-white font-semibold text-base shadow-sm"
                        onClick={handleSave}
                        disabled={isUpdating}
                    >
                        {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Changes"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
