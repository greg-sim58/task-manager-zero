import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  time: string;
  duration: number;
  category: string;
  color: string;
}

type ViewType = "day" | "week" | "month";
type FilterType = "all" | "shared" | "public" | "archived";

const EVENT_COLORS = [
  "bg-blue-500",
  "bg-red-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
];

const CATEGORIES = [
  "Work",
  "Personal",
  "Meeting",
  "Health",
  "Other",
];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<ViewType>("month");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [events, setEvents] = useState<Event[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ 
    title: "", 
    description: "", 
    time: "12:00", 
    duration: 60,
    category: "Work" 
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to view your events",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      const formattedEvents = data?.map(event => ({
        ...event,
        date: new Date(event.date),
      })) || [];

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: "Error loading events",
        description: "Failed to load your events. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!selectedDate || !newEvent.title) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to add events",
          variant: "destructive",
        });
        return;
      }

      const eventData = {
        user_id: user.id,
        title: newEvent.title,
        description: newEvent.description,
        date: selectedDate.toISOString(),
        time: newEvent.time,
        duration: newEvent.duration,
        category: newEvent.category,
        color: EVENT_COLORS[events.length % EVENT_COLORS.length],
      };

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      const newEventObj: Event = {
        ...data,
        date: new Date(data.date),
      };

      setEvents([...events, newEventObj]);
      setNewEvent({ title: "", description: "", time: "12:00", duration: 60, category: "Work" });
      setIsDialogOpen(false);
      
      toast({
        title: "Event created",
        description: "Your event has been added successfully",
      });
    } catch (error) {
      console.error('Error adding event:', error);
      toast({
        title: "Error creating event",
        description: "Failed to create your event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrevious = () => {
    if (viewType === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewType === "week") {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (viewType === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewType === "week") {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getDateRange = () => {
    if (viewType === "month") {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
    } else if (viewType === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    } else {
      return format(currentDate, "MMMM d, yyyy");
    }
  };

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(event.date, day));
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return (
      <div className="flex-1 bg-background border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day) => (
            <div key={day} className="p-4 text-sm font-medium text-muted-foreground border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr" style={{ height: "calc(100vh - 320px)" }}>
          {days.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const visibleEvents = dayEvents.slice(0, 3);
            const hasMore = dayEvents.length > 3;

            return (
              <div
                key={day.toString()}
                className={cn(
                  "border-r border-b last:border-r-0 p-2 overflow-hidden hover:bg-accent/50 cursor-pointer transition-colors",
                  !isCurrentMonth && "bg-muted/30",
                )}
                onClick={() => {
                  setSelectedDate(day);
                  setIsDialogOpen(true);
                }}
              >
                <div className={cn(
                  "text-sm font-medium mb-2 w-6 h-6 flex items-center justify-center rounded-full",
                  isToday && "bg-primary text-primary-foreground"
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {visibleEvents.map((event) => (
                    <div
                      key={event.id}
                      className="text-xs p-1 rounded flex items-center gap-1 hover:opacity-80 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", event.color)} />
                      <span className="truncate font-medium">{event.title}</span>
                      <span className="text-muted-foreground ml-auto flex-shrink-0">{event.time}</span>
                    </div>
                  ))}
                  {hasMore && (
                    <button className="text-xs text-muted-foreground hover:text-foreground">
                      {dayEvents.length - 3} more...
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex-1 bg-background border rounded-lg overflow-auto">
        <div className="grid grid-cols-8 border-b sticky top-0 bg-background z-10">
          <div className="p-4 border-r" />
          {days.map((day) => (
            <div key={day.toString()} className="p-4 text-center border-r last:border-r-0">
              <div className="text-sm font-medium">{format(day, "EEE")}</div>
              <div className={cn(
                "text-2xl font-bold mt-1",
                isSameDay(day, new Date()) && "text-primary"
              )}>
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-8">
          <div className="border-r">
            {hours.map((hour) => (
              <div key={hour} className="h-16 p-2 text-xs text-muted-foreground border-b">
                {format(new Date().setHours(hour, 0), "ha")}
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div key={day.toString()} className="border-r last:border-r-0">
              {hours.map((hour) => {
                const dayEvents = getEventsForDay(day);
                return (
                  <div
                    key={hour}
                    className="h-16 border-b hover:bg-accent/50 cursor-pointer transition-colors p-1"
                    onClick={() => {
                      setSelectedDate(new Date(day.setHours(hour, 0)));
                      setIsDialogOpen(true);
                    }}
                  >
                    {dayEvents
                      .filter((e) => e.time.startsWith(hour.toString().padStart(2, "0")))
                      .map((event) => (
                        <div
                          key={event.id}
                          className="text-xs p-1 rounded flex items-center gap-1 mb-1"
                          style={{ backgroundColor: `var(--${event.color.split("-")[1]}-500)` }}
                        >
                          <div className={cn("w-1.5 h-1.5 rounded-full bg-white flex-shrink-0")} />
                          <span className="truncate font-medium text-white">{event.title}</span>
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = getEventsForDay(currentDate);

    return (
      <div className="flex-1 bg-background border rounded-lg overflow-auto">
        <div className="border-b p-4 sticky top-0 bg-background z-10">
          <div className="text-center">
            <div className="text-sm font-medium">{format(currentDate, "EEEE")}</div>
            <div className="text-3xl font-bold mt-1">{format(currentDate, "MMMM d, yyyy")}</div>
          </div>
        </div>
        <div className="grid grid-cols-[100px_1fr]">
          <div className="border-r">
            {hours.map((hour) => (
              <div key={hour} className="h-20 p-2 text-sm text-muted-foreground border-b">
                {format(new Date().setHours(hour, 0), "h:mm a")}
              </div>
            ))}
          </div>
          <div>
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-20 border-b hover:bg-accent/50 cursor-pointer transition-colors p-2"
                onClick={() => {
                  setSelectedDate(new Date(currentDate.setHours(hour, 0)));
                  setIsDialogOpen(true);
                }}
              >
                {dayEvents
                  .filter((e) => e.time.startsWith(hour.toString().padStart(2, "0")))
                  .map((event) => (
                    <div
                      key={event.id}
                      className="p-2 rounded mb-2 flex items-start gap-2"
                      style={{ backgroundColor: `${event.color.replace('bg-', 'rgba(')}10` }}
                    >
                      <div className={cn("w-2 h-2 rounded-full mt-1 flex-shrink-0", event.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{event.title}</div>
                        <div className="text-xs text-muted-foreground">{event.time}</div>
                        {event.description && (
                          <div className="text-xs text-muted-foreground mt-1">{event.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 w-64"
          />
        </div>
      </div>

      {/* Filters */}
      <Tabs value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
        <TabsList>
          <TabsTrigger value="all">All events</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
          <TabsTrigger value="public">Public</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {format(currentDate, "MMM")}
            </span>
            <span className="text-xl font-bold">{format(currentDate, "d")}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {getDateRange()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Select value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day view</SelectItem>
              <SelectItem value="week">Week view</SelectItem>
              <SelectItem value="month">Month view</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Add event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Event</DialogTitle>
                <DialogDescription>
                  Create a new event for {format(selectedDate, "PPP")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter event title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="15"
                      step="15"
                      value={newEvent.duration}
                      onChange={(e) => setNewEvent({ ...newEvent, duration: parseInt(e.target.value) || 60 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newEvent.category} 
                    onValueChange={(value) => setNewEvent({ ...newEvent, category: value })}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter event description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddEvent} className="w-full">
                  Create Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Views */}
      {viewType === "month" && renderMonthView()}
      {viewType === "week" && renderWeekView()}
      {viewType === "day" && renderDayView()}
    </div>
  );
}
