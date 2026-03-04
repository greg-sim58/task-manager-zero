import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be under 200 characters"),
  description: z.string().max(1000, "Description must be under 1000 characters").optional().default(""),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  due_date: z.string().optional().default(""),
});

export const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be under 200 characters"),
  description: z.string().max(1000, "Description must be under 1000 characters").optional().default(""),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  duration: z.number().int().min(1, "Duration must be at least 1 minute").max(1440, "Duration cannot exceed 24 hours"),
  category: z.string().min(1, "Category is required").max(50),
});

export const authSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be under 255 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").max(128, "Password must be under 128 characters"),
});
