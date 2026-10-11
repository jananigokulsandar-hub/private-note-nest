import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pencil, Trash2, Plus, LogOut } from "lucide-react";

type Note = {
  id: string;
  title: string;
  body: string;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "My Notes" },
      { name: "description", content: "Create, edit, and manage your personal notes." },
      { property: "og:title", content: "My Notes" },
      { property: "og:description", content: "Create, edit, and manage your personal notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadNotes() {
    setLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, body, updated_at")
      .order("updated_at", { ascending: false });
    if (error) setError(error.message);
    else setNotes(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadNotes();
  }, []);

  function openNew() {
    setEditing(null);
    setTitle("");
    setBody("");
    setEditorOpen(true);
  }

  function openEdit(note: Note) {
    setEditing(note);
    setTitle(note.title);
    setBody(note.body);
    setEditorOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const { error } = await supabase
          .from("notes")
          .update({ title, body })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error("Not signed in");
        const { error } = await supabase
          .from("notes")
          .insert({ title, body, user_id: userData.user.id });
        if (error) throw error;
      }
      setEditorOpen(false);
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) setError(error.message);
    else setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold text-foreground">My Notes</h1>
          <div className="flex gap-2">
            <Button onClick={openNew} size="sm">
              <Plus className="mr-1 h-4 w-4" /> New note
            </Button>
            <Button onClick={handleSignOut} size="sm" variant="outline">
              <LogOut className="mr-1 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        {editorOpen && (
          <Card className="mb-6">
            <form onSubmit={handleSave}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editing ? "Edit note" : "New note"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <Textarea
                  placeholder="Write your note…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                />
              </CardContent>
              <CardFooter className="gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditorOpen(false)}
                >
                  Cancel
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading your notes…</p>
        ) : notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground">
              No notes yet. Click “New note” to write your first one.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <Card key={note.id}>
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-base">{note.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {new Date(note.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edit note"
                      onClick={() => openEdit(note)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete note"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                {note.body && (
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {note.body}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
