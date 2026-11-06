import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ResourcePage } from "@/components/resource-page";
import { fmtDate } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/portal-inbox")({
  head: () => ({ meta: [{ title: "Client requests — CA FirmHub" },
      { name: "description", content: "Review client document requests and submissions." },
      { property: "og:title", content: "Client requests \u2014 CA FirmHub" },
      { property: "og:description", content: "Review client document requests and submissions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ] }),
  component: Inbox,
});

export async function openFile(path: string) {
  const { data, error } = await supabase.storage.from("portal-files").createSignedUrl(path, 120);
  if (error || !data) { toast.error(error?.message ?? "Could not open file"); return; }
  window.open(data.signedUrl, "_blank");
}

function Files({ requestId }: { requestId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["portal_files", requestId],
    queryFn: async () => (await supabase.from("portal_files").select("*").eq("request_id", requestId).order("created_at")).data ?? [],
  });
  if (!data.length) return <p className="text-sm text-muted-foreground">No files uploaded yet.</p>;
  return (
    <ul className="space-y-2">
      {data.map((f) => (
        <li key={f.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <span className="truncate">{f.file_name}</span>
          <Button size="sm" variant="outline" onClick={() => openFile(f.file_path)}>Open</Button>
        </li>
      ))}
    </ul>
  );
}

function Inbox() {
  const [view, setView] = useState<string | null>(null);
  return (
    <>
      <ResourcePage
        table="doc_requests"
        title="Client requests"
        description="Ask clients for documents. They upload from their portal and you see the files here."
        select="*, clients(name), portal_files(count)"
        searchKeys={["title", "clients.name"]}
        filters={{ key: "status", options: ["Open", "Uploaded", "Closed"] }}
        rowActions={(r) => (
          <Button size="sm" variant="ghost" onClick={() => setView(r["id"])}>
            <Paperclip className="size-4" /> {r["portal_files"]?.[0]?.count ?? 0}
          </Button>
        )}
        fields={[
          { name: "client_id", label: "Client", type: "ref", ref: { table: "clients", label: "name" }, required: true },
          { name: "due_date", label: "Needed by", type: "date" },
          { name: "title", label: "What do you need?", required: true, full: true },
          { name: "description", label: "Details", type: "textarea" },
          { name: "status", label: "Status", type: "select", options: ["Open", "Uploaded", "Closed"], required: true, default: "Open" },
        ]}
        columns={[
          { key: "title", label: "Request", render: (r) => <span className="font-medium">{r["title"]}</span> },
          { key: "clients.name", label: "Client" },
          { key: "due_date", label: "Needed by", render: (r) => fmtDate(r["due_date"]) },
          { key: "status", label: "Status", status: true },
        ]}
      />
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Uploaded files</DialogTitle></DialogHeader>
          {view && <Files requestId={view} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
