import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListPlus, FolderKanban, StickyNote, Calendar as CalendarIcon } from "lucide-react";

// These buttons previously had no onClick at all and were labelled
// "Add Product" / "Add User" — e-commerce scaffold copy that never did
// anything. They now navigate to the real page for each action.
const actions = [
  { icon: ListPlus, label: "New Task", to: "/tasks" },
  { icon: FolderKanban, label: "New Project", to: "/projects" },
  { icon: StickyNote, label: "Notes", to: "/notes" },
  { icon: CalendarIcon, label: "Calendar", to: "/calendar" },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              onClick={() => navigate(action.to)}
              className="group h-24 flex-col gap-2.5 rounded-[var(--radius)] border-border/60 bg-background/40 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[calc(var(--radius)-6px)] bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/15">
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold tracking-tight">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
