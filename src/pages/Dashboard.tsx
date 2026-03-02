import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Plus, 
  FileText, 
  CalendarIcon, 
  Cpu, 
  Wifi, 
  HardDrive, 
  Cloud,
  Search
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  status: string;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
}

interface TaskProgress {
  title: string;
  progress: number;
}

export default function Dashboard() {
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("Creator");
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [taskProgress, setTaskProgress] = useState<TaskProgress[]>([]);
  const [calculatorDisplay, setCalculatorDisplay] = useState("2,450.00");
  const [calculatorExpression, setCalculatorExpression] = useState("");

  useEffect(() => {
    updateGreeting();
    fetchUserProfile();
    fetchRecentTasks();
    fetchTodayEvents();
    fetchTaskProgress();

    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
      updateGreeting();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();
        
        if (profile?.name) {
          setUserName(profile.name);
        }
      }
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchRecentTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, description, created_at, status")
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentTasks(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch tasks",
        variant: "destructive",
      });
    }
  };

  const fetchTodayEvents = async () => {
    try {
      // Mock events since events table isn't in the types
      // In production, this would fetch from the events table
      const mockEvents: Event[] = [];
      setTodayEvents(mockEvents);
    } catch (error) {
      console.error("Error fetching today's events:", error);
    }
  };

  const fetchTaskProgress = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("title, status")
        .order("created_at", { ascending: false })
        .limit(2);

      if (error) throw error;
      
      // Convert tasks to progress format for display
      const progress: TaskProgress[] = (data || []).map((task) => ({
        title: task.title,
        progress: task.status === "done" ? 95 : task.status === "in_progress" ? 32 : 0,
      }));
      
      setTaskProgress(progress);
    } catch (error) {
      console.error("Error fetching task progress:", error);
    }
  };

  const handleCalculatorClick = (value: string) => {
    if (value === "C") {
      setCalculatorDisplay("0");
      setCalculatorExpression("");
    } else if (value === "=") {
      try {
        const result = eval(calculatorExpression);
        setCalculatorDisplay(result.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setCalculatorExpression(result.toString());
      } catch {
        setCalculatorDisplay("Error");
        setCalculatorExpression("");
      }
    } else {
      const newExpression = calculatorExpression + value;
      setCalculatorExpression(newExpression);
      try {
        const preview = eval(newExpression);
        setCalculatorDisplay(preview.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      } catch {
        // Keep current display if expression is not yet valid
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {greeting}, {userName}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {format(currentDateTime, "EEEE, MMM d")} • {format(currentDateTime, "HH:mm")}
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
          <Search className="h-3 w-3" />
          Cmd+K
        </Badge>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Row 1: Tasks (Quick Notes), Today, System Widgets */}
        <Card className="md:col-span-4 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Quick Notes
            </CardTitle>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTasks.length > 0 ? (
              recentTasks.map((task) => (
                <div key={task.id} className="space-y-1">
                  <h4 className="text-sm font-medium">{task.title}</h4>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No tasks yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-4 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {todayEvents.length > 0 ? (
              todayEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className="text-xs text-muted-foreground min-w-[50px]">
                    {event.time}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{event.title}</h4>
                    {event.description && (
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No events scheduled</p>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-4 grid grid-cols-2 gap-4">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-4 flex flex-col items-center justify-center h-full">
              <Cpu className="h-6 w-6 mb-2 text-primary" />
              <div className="text-2xl font-bold">12%</div>
              <div className="text-xs text-muted-foreground">CPU LOAD</div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-4 flex flex-col items-center justify-center h-full">
              <Wifi className="h-6 w-6 mb-2 text-green-500" />
              <div className="text-2xl font-bold">1.2</div>
              <div className="text-xs text-muted-foreground">GB/s DOWN</div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-4 flex flex-col items-center justify-center h-full">
              <HardDrive className="h-6 w-6 mb-2 text-orange-500" />
              <div className="text-sm font-medium">SSD Status</div>
              <div className="text-xs text-muted-foreground">Healthy • 240GB Free</div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-4 flex flex-col items-center justify-center h-full">
              <Cloud className="h-6 w-6 mb-2 text-blue-400" />
              <div className="text-2xl font-bold">14°</div>
              <div className="text-xs text-muted-foreground">Rainy, Berlin</div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Calculator, Active Sprints */}
        <Card className="md:col-span-4 bg-card/50 backdrop-blur">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="bg-background/60 p-4 rounded-lg text-right">
                <div className="text-3xl font-mono font-bold">{calculatorDisplay}</div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {["7", "8", "9", "+"].map((btn) => (
                  <Button
                    key={btn}
                    variant="outline"
                    className="h-12"
                    onClick={() => handleCalculatorClick(btn)}
                  >
                    {btn}
                  </Button>
                ))}
                {["4", "5", "6", "×"].map((btn) => (
                  <Button
                    key={btn}
                    variant="outline"
                    className="h-12"
                    onClick={() => handleCalculatorClick(btn === "×" ? "*" : btn)}
                  >
                    {btn}
                  </Button>
                ))}
                {["1", "2", "3", "-"].map((btn) => (
                  <Button
                    key={btn}
                    variant="outline"
                    className="h-12"
                    onClick={() => handleCalculatorClick(btn)}
                  >
                    {btn}
                  </Button>
                ))}
                {["C", "0", "=", "÷"].map((btn) => (
                  <Button
                    key={btn}
                    variant={btn === "=" ? "default" : "outline"}
                    className="h-12"
                    onClick={() => handleCalculatorClick(btn === "÷" ? "/" : btn)}
                  >
                    {btn}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-8 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Sprints</CardTitle>
            <span className="text-xs text-muted-foreground">UPDATED 4M AGO</span>
          </CardHeader>
          <CardContent className="space-y-4">
            {taskProgress.length > 0 ? (
              taskProgress.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{item.title}</h4>
                    <span className="text-sm font-medium text-primary">{item.progress}%</span>
                  </div>
                  <Progress value={item.progress} className="h-2" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No active sprints</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
