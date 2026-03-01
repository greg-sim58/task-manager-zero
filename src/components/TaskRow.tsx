import { useState } from "react";
import { ChevronRight, ChevronDown, Circle, CheckCircle2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface Task {
    id: string;
    title: string;
    description: string | null;
    status: "todo" | "in_progress" | "done";
    priority: "low" | "medium" | "high";
    due_date: string | null;
    created_at: string;
    parent_id: string | null;
    user_id: string;
    ai_generated: boolean;
    position: number;
}

interface TaskRowProps {
    task: Task;
    subtasks?: Task[];
    level?: number;
    onToggleStatus: (task: Task) => void;
    onSelectTask: (task: Task) => void;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

const priorityColors = {
    low: "bg-[hsl(var(--users-bg))] text-[hsl(var(--users-icon))] border-none",
    medium: "bg-[hsl(var(--orders-bg))] text-[hsl(var(--orders-icon))] border-none",
    high: "bg-destructive/10 text-destructive border-none",
};

export function TaskRow({
    task,
    subtasks = [],
    level = 0,
    onToggleStatus,
    onSelectTask,
    isExpanded = false,
    onToggleExpand,
}: TaskRowProps) {
    const hasSubtasks = subtasks.length > 0;
    const isDone = task.status === "done";

    return (
        <div className="flex flex-col w-full">
            <div
                className={cn(
                    "group flex items-center py-3 px-4 hover:bg-accent/50 transition-colors cursor-pointer border border-border/50 bg-card rounded-[var(--radius)] shadow-sm",
                    level > 0 && "ml-8"
                )}
                onClick={() => onSelectTask(task)}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center w-6 justify-center">
                        {hasSubtasks && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleExpand?.();
                                }}
                                className="hover:bg-accent p-0.5 rounded transition-colors"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                            </button>
                        )}
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(task);
                        }}
                        className="flex-shrink-0"
                    >
                        {isDone ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                    </button>

                    <div className="flex flex-col min-w-0">
                        <span
                            className={cn(
                                "text-sm font-medium truncate transition-all",
                                isDone && "text-muted-foreground line-through"
                            )}
                        >
                            {task.title}
                        </span>
                        <div className="flex items-center gap-3 mt-0.5">
                            {task.due_date && (
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(task.due_date), "MMM dd")}
                                </div>
                            )}
                            <Badge className={cn("text-[10px] px-1.5 py-0 h-4 uppercase tracking-wider", priorityColors[task.priority])}>
                                {task.priority}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            {hasSubtasks && isExpanded && (
                <div className="flex flex-col gap-1 mt-1">
                    {subtasks.map((subtask) => (
                        <TaskRow
                            key={subtask.id}
                            task={subtask}
                            level={level + 1}
                            onToggleStatus={onToggleStatus}
                            onSelectTask={onSelectTask}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
