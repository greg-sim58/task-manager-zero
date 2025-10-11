import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Plus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import RecurringEventDialog from "@/components/RecurringEventDialog";

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
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [recurringOptions, setRecurringOptions] = useState<any>(null);
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

    // If recurring is checked but options not set, open recurring dialog
    if (isRecurring && !recurringOptions) {
      setIsRecurringDialogOpen(true);
      return;
    }

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

      if (editingEvent) {
        // Update existing event
        const eventData = {
          title: newEvent.title,
          description: newEvent.description,
          date: selectedDate.toISOString(),
          time: newEvent.time,
          duration: newEvent.duration,
          category: newEvent.category,
        };

        const { data, error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id)
          .select()
          .single();

        if (error) throw error;

        const updatedEvent: Event = {
          ...data,
          date: new Date(data.date),
        };

        setEvents(events.map(e => e.id === editingEvent.id ? updatedEvent : e));
        
        toast({
          title: "Event updated",
          description: "Your event has been updated successfully",
        });
      } else if (isRecurring && recurringOptions) {
        // Create recurring events
        const eventsToCreate = [];
        const color = EVENT_COLORS[events.length % EVENT_COLORS.length];
        let currentDate = new Date(selectedDate);
        const endDate = recurringOptions.endDate || addMonths(selectedDate, 12); // Default to 1 year if no end date
        
        while (currentDate <= endDate) {
          // Check if this day should be included (for weekly recurrence)
          const shouldInclude = recurringOptions.frequency !== 'week' || 
            recurringOptions.daysOfWeek.length === 0 ||
            recurringOptions.daysOfWeek.includes(format(currentDate, 'EEEE').toLowerCase());

          if (shouldInclude) {
            eventsToCreate.push({
              user_id: user.id,
              title: newEvent.title,
              description: newEvent.description,
              date: currentDate.toISOString(),
              time: newEvent.time,
              duration: newEvent.duration,
              category: newEvent.category,
              color: color,
              is_recurring: true,
              recurrence_frequency: recurringOptions.frequency,
              recurrence_interval: recurringOptions.interval,
              recurrence_days_of_week: recurringOptions.daysOfWeek,
              recurrence_end_date: recurringOptions.endDate?.toISOString(),
            });
          }

          // Increment date based on frequency
          if (recurringOptions.frequency === 'day') {
            currentDate = addDays(currentDate, recurringOptions.interval);
          } else if (recurringOptions.frequency === 'week') {
            currentDate = addDays(currentDate, 7 * recurringOptions.interval);
          } else if (recurringOptions.frequency === 'month') {
            currentDate = addMonths(currentDate, recurringOptions.interval);
          } else if (recurringOptions.frequency === 'year') {
            currentDate = addMonths(currentDate, 12 * recurringOptions.interval);
          }
        }

        const { data, error } = await supabase
          .from('events')
          .insert(eventsToCreate)
          .select();

        if (error) throw error;

        const newEventObjs: Event[] = data.map(event => ({
          ...event,
          date: new Date(event.date),
        }));

        setEvents([...events, ...newEventObjs]);
        
        toast({
          title: "Recurring events created",
          description: `${newEventObjs.length} events have been added successfully`,
        });
      } else {
        // Create single event
        const eventData = {
          user_id: user.id,
          title: newEvent.title,
          description: newEvent.description,
          date: selectedDate.toISOString(),
          time: newEvent.time,
          duration: newEvent.duration,
          category: newEvent.category,
          color: EVENT_COLORS[events.length % EVENT_COLORS.length],
          is_recurring: false,
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
        
        toast({
          title: "Event created",
          description: "Your event has been added successfully",
        });
      }

      setNewEvent({ title: "", description: "", time: "12:00", duration: 60, category: "Work" });
      setEditingEvent(null);
      setIsRecurring(false);
      setRecurringOptions(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: editingEvent ? "Error updating event" : "Error creating event",
        description: "Failed to save your event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', editingEvent.id);

      if (error) throw error;

      setEvents(events.filter(e => e.id !== editingEvent.id));
      setNewEvent({ title: "", description: "", time: "12:00", duration: 60, category: "Work" });
      setEditingEvent(null);
      setIsDialogOpen(false);
      
      toast({
        title: "Event deleted",
        description: "Your event has been deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error deleting event",
        description: "Failed to delete your event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setSelectedDate(event.date);
    setNewEvent({
      title: event.title,
      description: event.description || "",
      time: event.time,
      duration: event.duration,
      category: event.category,
    });
    setIsDialogOpen(true);
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
      <div className="flex-1 bg-background border rounded-lg overflow-auto">
        <div className="grid grid-cols-7 border-b sticky top-0 bg-background z-10">
          {weekDays.map((day) => (
            <div key={day} className="p-4 text-sm font-medium text-muted-foreground border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-auto">
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
                  "border-r border-b last:border-r-0 p-2 min-h-[120px] hover:bg-accent/50 cursor-pointer transition-colors",
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
                      className="text-xs p-1 rounded flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditEvent(event);
                      }}
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
                          className="text-xs p-1 rounded flex items-center gap-1 mb-1 cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: `var(--${event.color.split("-")[1]}-500)` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditEvent(event);
                          }}
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
                      className="p-2 rounded mb-2 flex items-start gap-2 cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: `${event.color.replace('bg-', 'rgba(')}10` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditEvent(event);
                      }}
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
            <span className="text-sm font-bold text-muted-foreground">
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

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingEvent(null);
              setNewEvent({ title: "", description: "", time: "12:00", duration: 60, category: "Work" });
              setIsRecurring(false);
              setRecurringOptions(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Add event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEvent ? "Edit Event" : "Add New Event"}</DialogTitle>
                <DialogDescription>
                  {editingEvent ? "Update the event details" : `Create a new event for ${format(selectedDate, "PPP")}`}
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
                {!editingEvent && (
                  <Button
                    type="button"
                    variant={isRecurring ? "secondary" : "outline"}
                    className="w-full"
                    onClick={() => {
                      if (isRecurring) {
                        // Remove recurring options
                        setIsRecurring(false);
                        setRecurringOptions(null);
                      } else {
                        // Open recurring dialog
                        setIsRecurring(true);
                        setIsRecurringDialogOpen(true);
                      }
                    }}
                  >
                    {isRecurring ? "Remove recurring pattern" : "Make this a recurring event"}
                  </Button>
                )}
              </div>
              <DialogFooter className="flex gap-2">
                {editingEvent && (
                  <Button onClick={handleDeleteEvent} variant="destructive" className="flex-1">
                    Delete Event
                  </Button>
                )}
                <Button onClick={handleAddEvent} className="flex-1">
                  {editingEvent ? "Update Event" : "Create Event"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Recurring Event Dialog */}
      <RecurringEventDialog
        open={isRecurringDialogOpen}
        onOpenChange={setIsRecurringDialogOpen}
        startDate={selectedDate}
        onSave={(options) => {
          setRecurringOptions(options);
          setIsRecurringDialogOpen(false);
          // Automatically trigger event creation after setting recurring options
          setTimeout(() => handleAddEvent(), 100);
        }}
      />

      {/* Calendar Views */}
      {viewType === "month" && renderMonthView()}
      {viewType === "week" && renderWeekView()}
      {viewType === "day" && renderDayView()}
    </div>
  );
}
