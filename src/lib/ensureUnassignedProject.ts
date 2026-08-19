import { supabase } from "@/integrations/supabase/client";

const UNASSIGNED_NAME = "Unassigned";
const UNASSIGNED_COLOR = "bg-muted";

/**
 * Returns the id of the current user's "Unassigned" project, creating it
 * if it does not yet exist. Returns null on failure (never throws).
 */
export async function ensureUnassignedProject(
  userId: string
): Promise<string | null> {
  try {
    const { data: existing, error: findError } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", userId)
      .eq("name", UNASSIGNED_NAME)
      .maybeSingle();

    if (findError) throw findError;
    if (existing) return existing.id;

    const { data: created, error: createError } = await supabase
      .from("projects")
      .insert([
        {
          name: UNASSIGNED_NAME,
          user_id: userId,
          status: "active",
          color: UNASSIGNED_COLOR,
        },
      ])
      .select("id")
      .single();

    if (createError) throw createError;
    return created?.id ?? null;
  } catch (error) {
    console.error("ensureUnassignedProject failed:", error);
    return null;
  }
}

/**
 * Assigns every task belonging to the user that currently has no project
 * to their "Unassigned" project (creating that project if needed).
 * Returns the number of tasks updated. Silent on success; logs on error.
 */
export async function assignOrphanTasks(userId: string): Promise<number> {
  try {
    const projectId = await ensureUnassignedProject(userId);
    if (!projectId) return 0;

    const { count, error } = await supabase
      .from("tasks")
      .update({ project_id: projectId })
      .is("project_id", null)
      .eq("user_id", userId);

    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error("assignOrphanTasks failed:", error);
    return 0;
  }
}
