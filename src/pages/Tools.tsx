import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, StickyNote } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotesGateDialog } from "@/components/NotesGateDialog";

const tools = [
  {
    title: "Documents",
    description: "Manage your documents",
    icon: FileText,
  },
  {
    title: "Notes",
    description: "Capture ideas and take notes",
    icon: StickyNote,
    gated: true,
  },
];

const NOTES_UNLOCK_KEY = "notes-unlocked";

export default function Tools() {
  const navigate = useNavigate();
  const [gateOpen, setGateOpen] = useState(false);

  const handleToolClick = (tool: (typeof tools)[number]) => {
    if (tool.title === "Notes") {
      setGateOpen(true);
      return;
    }
    if (tool.title === "Documents") {
      return;
    }
  };

  const handleUnlock = () => {
    sessionStorage.setItem(NOTES_UNLOCK_KEY, "1");
    navigate("/notes");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Tools</h1>
        <p className="mt-1 text-muted-foreground">Access your productivity tools</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {tools.map((tool) => (
          <Card
            key={tool.title}
            className="hover-scale cursor-pointer transition-all hover:shadow-lg"
            onClick={() => handleToolClick(tool)}
          >
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <tool.icon className="h-6 w-6" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="mb-2">{tool.title}</CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <NotesGateDialog
        open={gateOpen}
        onOpenChange={setGateOpen}
        onUnlock={handleUnlock}
      />
    </div>
  );
}
