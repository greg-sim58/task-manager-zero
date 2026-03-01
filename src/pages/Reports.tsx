import { Calculator, FileText, Calendar, Mail, StickyNote } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const tools = [
  {
    title: "Calculator",
    description: "Perform quick calculations",
    icon: Calculator,
  },
  {
    title: "Documents",
    description: "Manage your documents",
    icon: FileText,
  },
  {
    title: "Calendar",
    description: "Schedule and plan events",
    icon: Calendar,
  },
  {
    title: "Email",
    description: "Send and receive messages",
    icon: Mail,
  },
  {
    title: "Notes",
    description: "Capture ideas and take notes",
    icon: StickyNote,
  },
];

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
        <p className="text-muted-foreground">Access your productivity tools</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {tools.map((tool) => (
          <Card key={tool.title} className="hover-scale cursor-pointer transition-all hover:shadow-lg">
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
    </div>
  );
}
