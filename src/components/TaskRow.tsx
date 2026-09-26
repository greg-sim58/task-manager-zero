import { ChevronRight, ChevronDown, Circle, CheckCircle2, Calendar, Trash2 } from "lucide-react";
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
    project_id: string | null;
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
    onDelete?: (task: Task) => void;
}

const priorityRail = {
    low: "bg-[hsl(var(--accent-2))]",
    medium: "bg-[hsl(var(--accent-4))]",
    high: "bg-destructive",
};

const priorityText = {
    low: "text-[hsl(var(--accent-2))]",
    medium: "text-[hsl(var(--accent-4))]",
    high: "text-destructive",
};

export function TaskRow({
    task,
    subtasks = [],
    level = 0,
    onToggleStatus,
    onSelectTask,
    isExpanded = false,
    onToggleExpand,
    onDelete,
}: TaskRowProps) {
    const hasSubtasks = subtasks.length > 0;
    const isDone = task.status === "done";

    return (
        <div className="flex flex-col w-full">
            <div
                className={cn(
                    "group relative flex items-center py-3 pl-4 pr-4 hover:bg-accent/40 transition-colors cursor-pointer",
                    level > 0 && "ml-8"
                )}
                onClick={() => onSelectTask(task)}
            >
                {/* Priority rail — a glowing edge instead of a filled badge */}
                <span
                    aria-hidden
                    className={cn(
                        "absolute inset-y-2 left-0 w-[3px] rounded-full transition-all duration-300",
                        priorityRail[task.priority],
                        isDone ? "opacity-30" : "opacity-100"
                    )}
                />

                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center w-6 justify-center">
                        {hasSubtasks && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleExpand?.();
                                }}
                                aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
                                className="p-0.5 rounded transition-transform duration-200 hover:bg-accent"
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
                        aria-label={isDone ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
                        className="flex-shrink-0 transition-transform duration-200 active:scale-90"
                    >
                        {isDone ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                            <Circle className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary-2" />
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
                        <div className="flex items-center gap-3 mt-1">
                            <span
                                className={cn(
                                    "font-mono text-[10px] font-semibold uppercase tracking-widest",
                                    isDone && "opacity-50",
                                    priorityText[task.priority]
                                )}
                            >
                                {task.priority}
                            </span>
                            {task.due_date && (
                                <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(task.due_date), "MMM dd")}
                                </div>
                            )}
                            {hasSubtasks && (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                    {subtasks.length} subtask{subtasks.length === 1 ? "" : "s"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {onDelete && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(task);
                        }}
                        className="ml-3 flex-shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label="Delete task"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            {hasSubtasks && isExpanded && (
                <div className="flex flex-col mt-1 divide-y divide-border/40">
                    {subtasks.map((subtask) => (
                        <TaskRow
                            key={subtask.id}
                            task={subtask}
                            level={level + 1}
                            onToggleStatus={onToggleStatus}
                            onSelectTask={onSelectTask}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
