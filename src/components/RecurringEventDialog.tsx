import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface RecurringOptions {
  frequency: string;
  interval: number;
  daysOfWeek: string[];
  endDate: Date | null;
}

interface RecurringEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startDate: Date;
  onSave: (options: RecurringOptions) => void;
}

const DAYS = [
  { label: "M", value: "monday" },
  { label: "T", value: "tuesday" },
  { label: "W", value: "wednesday" },
  { label: "T", value: "thursday" },
  { label: "F", value: "friday" },
  { label: "S", value: "saturday" },
  { label: "S", value: "sunday" },
];

export default function RecurringEventDialog({
  open,
  onOpenChange,
  startDate,
  onSave,
}: RecurringEventDialogProps) {
  const [frequency, setFrequency] = useState<string>("week");
  const [interval, setInterval] = useState<number>(1);
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const toggleDay = (day: string) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    onSave({
      frequency,
      interval,
      daysOfWeek,
      endDate,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Repeat</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start</Label>
            <div className="flex items-center gap-2">
              <Input
                value={format(startDate, "MM/dd/yyyy")}
                readOnly
                className="flex-1"
              />
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          {/* Repeat Every */}
          <div className="space-y-2">
            <Label>Repeat every</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">day</SelectItem>
                  <SelectItem value="week">week</SelectItem>
                  <SelectItem value="month">month</SelectItem>
                  <SelectItem value="year">year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Days of Week (only for weekly recurrence) */}
          {frequency === "week" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                {DAYS.map((day, idx) => (
                  <Button
                    key={idx}
                    variant={daysOfWeek.includes(day.value) ? "default" : "outline"}
                    size="icon"
                    className="w-10 h-10"
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* End Date */}
          <div className="space-y-2">
            <Label>Occurs every {frequency} until</Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "No end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate || undefined}
                    onSelect={(date) => setEndDate(date || null)}
                    disabled={(date) => date < startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {endDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEndDate(null)}
                >
                  Remove end date
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">
            Save
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Discard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
