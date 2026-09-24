import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Markdown } from "@/components/Markdown";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, StickyNote, Loader2, Trash2, Pencil } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

interface Note {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  created_at: string;
  updated_at: string;
}

const NOTES_UNLOCK_KEY = "notes-unlocked";

export default function Notes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ title: "", body: "" });
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ title: "", body: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(NOTES_UNLOCK_KEY) !== "1") {
      navigate("/tools");
      return;
    }

    fetchNotes();

    const channel = supabase
      .channel("notes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes" },
        () => fetchNotes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes((data || []) as Note[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to load notes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: "", body: "" });
  };

  const handleEditNote = (note: Note) => {
    setExpandedNoteId(note.id);
    setEditFormData({ title: note.title, body: note.body || "" });
  };

  const handleCloseEdit = () => {
    setExpandedNoteId(null);
    setEditFormData({ title: "", body: "" });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedNoteId || !editFormData.title.trim()) return;

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("notes")
        .update({
          title: editFormData.title.trim(),
          body: editFormData.body.trim() || null,
        })
        .eq("id", expandedNoteId);

      if (error) throw error;

      toast({ title: "Success", description: "Note updated successfully" });
      handleCloseEdit();
      fetchNotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to update note.",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create notes",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("notes").insert([
        {
          title: formData.title.trim(),
          body: formData.body.trim() || null,
          user_id: user.id,
        },
      ]);

      if (error) throw error;

      toast({ title: "Success", description: "Note created successfully" });
      setDialogOpen(false);
      resetForm();
      fetchNotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to create note.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!noteToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from("notes").delete().eq("id", noteToDelete.id);
      if (error) throw error;
      fetchNotes();
      toast({ title: "Deleted", description: "Note removed." });
      setNoteToDelete(null);
      setExpandedNoteId(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to delete note.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="space-y-6">Loading notes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
          <p className="text-muted-foreground">
            Capture ideas and take notes.
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            New Note
          </Button>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Note</DialogTitle>
                <DialogDescription>
                  Add a new note to your collection.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Note title"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Body</Label>
                  <MarkdownEditor
                    id="body"
                    value={formData.body}
                    onChange={(body) => setFormData({ ...formData, body })}
                    placeholder="Write your note here... (Markdown supported)"
                    rows={5}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !formData.title.trim()}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <StickyNote className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No notes yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => {
            const isExpanded = expandedNoteId === note.id;
            return (
              <div key={note.id} className="relative">
                {isExpanded && (
                  <div
                    className="fixed inset-0 z-20 bg-black/20"
                    onClick={handleCloseEdit}
                  />
                )}
                <Card
                  className={`flex flex-col cursor-pointer select-none transition-all ${
                    isExpanded
                      ? "fixed left-1/2 top-1/2 z-30 w-[80%] max-w-4xl min-h-[60vh] -translate-x-1/2 -translate-y-1/2 ring-2 ring-primary shadow-xl"
                      : "h-[180px] hover:bg-accent/30"
                  }`}
                  onDoubleClick={() => !isExpanded && handleEditNote(note)}
                >
                  {isExpanded ? (
                    <form onSubmit={handleSaveEdit} className="flex flex-1 flex-col">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Edit Note</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`edit-title-${note.id}`}>Title</Label>
                          <Input
                            id={`edit-title-${note.id}`}
                            value={editFormData.title}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, title: e.target.value })
                            }
                            autoFocus
                          />
                        </div>
                        <div className="flex flex-1 flex-col space-y-2">
                          <Label htmlFor={`edit-body-${note.id}`}>Body</Label>
                          <MarkdownEditor
                            id={`edit-body-${note.id}`}
                            value={editFormData.body}
                            onChange={(body) =>
                              setEditFormData({ ...editFormData, body })
                            }
                            className="flex-1"
                            textareaClassName="flex-1"
                            rows={6}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setNoteToDelete(note)}
                          >
                            Delete
                          </Button>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleCloseEdit}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={savingEdit || !editFormData.title.trim()}
                            >
                              {savingEdit ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Save"
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </form>
                  ) : (
                    <>
                      <CardHeader className="flex-1 min-h-0 overflow-hidden pb-3">
                        <CardTitle className="text-lg">{note.title}</CardTitle>
                        {note.body && <Markdown content={note.body} className="mt-1.5" />}
                      </CardHeader>
                      <CardContent className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                        <span>{format(new Date(note.created_at), "MMM dd, yyyy")}</span>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditNote(note);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit this note</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNoteToDelete(note);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete this note</TooltipContent>
                          </Tooltip>
                        </div>
                      </CardContent>
                    </>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={!!noteToDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setNoteToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
