import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { verifyNotesKey, NOTES_KEY_PATTERN } from "@/lib/notesGate";

interface NotesGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlock: () => void;
}

export function NotesGateDialog({
  open,
  onOpenChange,
  onUnlock,
}: NotesGateDialogProps) {
  const [keyInput, setKeyInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormatValid = NOTES_KEY_PATTERN.test(keyInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormatValid) {
      setError("Key must be at least 4 alphanumeric characters (A-Z, a-z, 0-9).");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in.");
        return;
      }

      const ok = await verifyNotesKey(user.id, keyInput);
      if (ok) {
        setKeyInput("");
        onOpenChange(false);
        onUnlock();
      } else {
        setError("Incorrect key. Access denied.");
      }
    } catch {
      setError("Unable to verify key. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setKeyInput("");
      setError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <DialogTitle>Notes Access</DialogTitle>
            </div>
            <DialogDescription>
              Enter your key to access your notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="notes-key">Key</Label>
            <Input
              id="notes-key"
              type="password"
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setError(null);
              }}
              placeholder="Enter your key"
              autoFocus
              autoComplete="off"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormatValid || verifying}
            >
              {verifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Unlock"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
