import { supabase } from "@/integrations/supabase/client";

export const NOTES_KEY_PATTERN = /^[A-Za-z0-9]{4,}$/;

/**
 * Verifies the entered key against the user's stored profile.notes_key.
 * Returns true only if a key is set AND it matches. Returns false if no
 * key is set, the row doesn't exist, or the key doesn't match.
 */
export async function verifyNotesKey(
  userId: string,
  enteredKey: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("notes_key")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data || !data.notes_key) return false;

    return data.notes_key === enteredKey;
  } catch (error) {
    console.error("verifyNotesKey failed:", error);
    return false;
  }
}

/**
 * Persists the user's chosen notes key. Creates or updates the profile row.
 */
export async function setNotesKey(
  userId: string,
  key: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: userId, notes_key: key },
        { onConflict: "id" }
      );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("setNotesKey failed:", error);
    return false;
  }
}

/**
 * Checks whether the user has a notes key set.
 */
export async function hasNotesKey(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("notes_key")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return !!(data && data.notes_key);
  } catch (error) {
    console.error("hasNotesKey failed:", error);
    return false;
  }
}
