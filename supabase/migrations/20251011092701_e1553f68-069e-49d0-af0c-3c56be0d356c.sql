-- Add recurring event fields to events table
ALTER TABLE public.events 
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN recurrence_frequency text,
ADD COLUMN recurrence_interval integer,
ADD COLUMN recurrence_days_of_week text[],
ADD COLUMN recurrence_end_date timestamp with time zone,
ADD COLUMN parent_event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;