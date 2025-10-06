import { useState } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
}

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", description: "" });

  const handleAddEvent = () => {
    if (!selectedDate || !newEvent.title) return;

    const event: Event = {
      id: Date.now().toString(),
      title: newEvent.title,
      description: newEvent.description,
      date: selectedDate,
    };

    setEvents([...events, event]);
    setNewEvent({ title: "", description: "" });
    setIsDialogOpen(false);
  };

  const eventsForSelectedDate = events.filter(
    (event) => format(event.date, "yyyy-MM-dd") === format(selectedDate || new Date(), "yyyy-MM-dd")
  );

  const datesWithEvents = events.map((event) => format(event.date, "yyyy-MM-dd"));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">Manage your schedule and events</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
              <DialogDescription>
                Create a new event for {selectedDate && format(selectedDate, "PPP")}
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Select a date to view or add events</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className={cn("rounded-md border pointer-events-auto")}
              modifiers={{
                hasEvent: (date) => datesWithEvents.includes(format(date, "yyyy-MM-dd")),
              }}
              modifiersStyles={{
                hasEvent: {
                  fontWeight: "bold",
                  textDecoration: "underline",
                },
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
            </CardTitle>
            <CardDescription>
              {eventsForSelectedDate.length} {eventsForSelectedDate.length === 1 ? "event" : "events"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eventsForSelectedDate.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events scheduled for this day</p>
            ) : (
              <div className="space-y-4">
                {eventsForSelectedDate.map((event) => (
                  <div key={event.id} className="space-y-1 rounded-lg border p-3">
                    <h4 className="font-semibold">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
