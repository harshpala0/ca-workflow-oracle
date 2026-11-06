import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui-bits";
import { LIBRARY_CATALOG } from "@/lib/library-catalog";
import { useMe } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "Study material — CA FirmHub" },
      { name: "description", content: "Official Income Tax, GST, MCA, ICAI and RBI sources plus your firm's own study material links." },
      { property: "og:title", content: "Study material \u2014 CA FirmHub" },
      { property: "og:description", content: "Official Income Tax, GST, MCA, ICAI and RBI sources plus your firm's own study material links." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ title: "", url: "", category: "Firm material", description: "" });
  const firm = useQuery({
    queryKey: ["library_items"],
    queryFn: async () => (await supabase.from("library_items").select("*").order("category").order("title")).data ?? [],
  });
  const add = useMutation({
    mutationFn: async () => {
      if (!form.title || !/^https?:\/\//.test(form.url)) throw new Error("Add a title and a link starting with https://");
      const { error } = await supabase.from("library_items").insert({ ...form, description: form.description || null, firm_id: me.firm_id, created_by: me.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Added to library"); setForm({ title: "", url: "", category: "Firm material", description: "" }); qc.invalidateQueries({ queryKey: ["library_items"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("library_items").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library_items"] }),
  });
  const match = (s: string) => s.toLowerCase().includes(q.toLowerCase());

  return (
    <div>
      <PageHeader title="Study material" description="Official sources and your firm's own reference links." actions={<Input className="w-64" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />} />

      <section className="mb-8 rounded-lg border bg-card p-5 shadow-card">
        <h2 className="text-lg font-semibold">Firm material</h2>
        {me.isManager && (
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="https://… (Drive, Dropbox, website)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Button onClick={() => add.mutate()} disabled={add.isPending}>Add link</Button>
            <Input className="sm:col-span-4" placeholder="Short description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        )}
        <ul className="mt-4 divide-y">
          {(firm.data ?? []).filter((i) => match(i.title + i.category)).length === 0 && <li className="py-3 text-sm text-muted-foreground">No firm links yet.</li>}
          {(firm.data ?? []).filter((i) => match(i.title + i.category)).map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <a href={i.url} target="_blank" rel="noreferrer" className="min-w-0 hover:underline">
                <span className="font-medium">{i.title}</span> <span className="text-muted-foreground">· {i.category}</span>
                {i.description && <div className="truncate text-xs text-muted-foreground">{i.description}</div>}
              </a>
              {me.isManager && <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => del.mutate(i.id)}><Trash2 className="h-4 w-4" /></Button>}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {LIBRARY_CATALOG.map((c) => {
          const items = c.items.filter((i) => match(i.title + i.source + c.title));
          if (items.length === 0) return null;
          return (
            <section key={c.id} className="rounded-lg border bg-card p-5 shadow-card">
              <h2 className="font-semibold">{c.icon} {c.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
              <ul className="mt-3 space-y-1.5">
                {items.map((i) => (
                  <li key={i.url + i.title}>
                    <a href={i.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm hover:underline">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />{i.title}
                      <span className="text-xs text-muted-foreground">({i.source} · {i.type})</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
