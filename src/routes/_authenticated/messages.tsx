import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/session";
import { pulseQuery } from "@/lib/pulse";
import { ageBucket, inr, outstanding } from "@/lib/compliance";
import { PageHeader, fmtDate } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages & digest — CA FirmHub" },
      { name: "description", content: "Review firm communications and daily digests." },
      { property: "og:title", content: "Messages & digest \u2014 CA FirmHub" },
      { property: "og:description", content: "Review firm communications and daily digests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ] }),
  component: Messages,
});

const digits = (p: string) => p.replace(/\D/g, "").replace(/^0+/, "").replace(/^(\d{10})$/, "91$1");
const card = "rounded-lg border bg-card shadow-card";

function Messages() {
  const me = useMe();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const clients = useQuery({
    queryKey: ["msg-clients"],
    queryFn: async () => (await supabase.from("clients").select("id, name, contact_person, contact_email, contact_phone").eq("is_active", true).order("name")).data ?? [],
  });
  const firm = useQuery({
    queryKey: ["firm-notify", me.firm_id],
    queryFn: async () => (await supabase.from("firms").select("notify_email, notify_phone, notify_from_name").eq("id", me.firm_id).single()).data,
  });
  const pulse = useQuery(pulseQuery(me.isManager));
  const log = useQuery({
    queryKey: ["message-log"],
    enabled: me.isManager,
    queryFn: async () => (await supabase.from("message_log").select("id, channel, subject, body, created_at, clients(name)").order("created_at", { ascending: false }).limit(15)).data ?? [],
  });

  const [settings, setSettings] = useState({ notify_email: "", notify_phone: "", notify_from_name: "" });
  useEffect(() => {
    if (firm.data) setSettings({ notify_email: firm.data.notify_email ?? "", notify_phone: firm.data.notify_phone ?? "", notify_from_name: firm.data.notify_from_name ?? "" });
  }, [firm.data]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      if (settings.notify_email && !settings.notify_email.includes("@")) throw new Error("Enter a valid email address");
      const { error } = await supabase.from("firms").update({
        notify_email: settings.notify_email || null, notify_phone: settings.notify_phone || null, notify_from_name: settings.notify_from_name || null,
      }).eq("id", me.firm_id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Notification settings saved"); qc.invalidateQueries({ queryKey: ["firm-notify"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const logSend = useMutation({
    mutationFn: async (v: { client_id: string; channel: string }) => {
      await supabase.from("message_log").insert({ firm_id: me.firm_id, client_id: v.client_id, channel: v.channel, subject: subject || null, body, sent_by: me.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["message-log"] }),
  });

  const sign = `\n\n— ${settings.notify_from_name || me.firm_name}`;
  const open = (url: string, client_id: string, channel: string) => {
    if (!body.trim()) { toast.error("Write a message first"); return; }
    window.open(url, "_blank", "noopener");
    logSend.mutate({ client_id, channel });
  };

  const today = pulse.data?.today ?? "";
  const digest = pulse.data ? [
    `${me.firm_name} — daily digest (${fmtDate(today)})`,
    "",
    `Overdue compliance (${pulse.data.overdue.length}):`,
    ...pulse.data.overdue.map((c) => `• ${c.clients?.name ?? "—"}: ${c.title} (due ${fmtDate(c.due_date)})`),
    "",
    `Due in next 15 days (${pulse.data.compliance.length - pulse.data.overdue.length}):`,
    ...pulse.data.compliance.filter((c) => c.due_date >= today).map((c) => `• ${c.clients?.name ?? "—"}: ${c.title} (${fmtDate(c.due_date)})`),
    "",
    `Pending client documents (${pulse.data.requests.length}):`,
    ...pulse.data.requests.map((r) => `• ${r.clients?.name ?? "—"}: ${r.title}`),
    ...(me.isManager ? [
      "", `Unpaid invoices (${pulse.data.invoices.length}):`,
      ...pulse.data.invoices.map((i) => `• ${i.clients?.name ?? "—"}: ${i.invoice_no} ${inr(outstanding({ ...i, total_amount: Number(i.total_amount), payment_status: "Unpaid" }))} (${ageBucket(i.invoice_date)} days)`),
    ] : []),
    "", `Open tasks: ${pulse.data.openTasks} (overdue ${pulse.data.overdueTasks}) · Open queries: ${pulse.data.openQueries}`,
  ].join("\n") : "";

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const sel = (clients.data ?? []).filter((c) => picked.includes(c.id));

  return (
    <div>
      <PageHeader title="Messages & digest" description="Send a note to clients by email or WhatsApp, and share your daily practice digest." />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="border-b px-5 py-4 text-lg font-semibold">Message clients</h2>
          <div className="space-y-4 p-5">
            <div><Label className="mb-1.5 block">Subject (email)</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div><Label className="mb-1.5 block">Message</Label><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Dear client, …" /></div>
            <div>
              <Label className="mb-1.5 block">Recipients</Label>
              <div className="max-h-56 overflow-y-auto rounded-md border">
                {clients.data?.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-0">
                    <input type="checkbox" checked={picked.includes(c.id)} onChange={() => toggle(c.id)} />
                    <span className="flex-1">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.contact_email ? "email" : ""} {c.contact_phone ? "· phone" : ""}</span>
                  </label>
                ))}
                {clients.data?.length === 0 && <p className="p-3 text-sm text-muted-foreground">No clients yet.</p>}
              </div>
            </div>
            {sel.length > 0 && (
              <ul className="divide-y rounded-md border">
                {sel.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span>{c.contact_person || c.name}</span>
                    <span className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={!c.contact_email}
                        onClick={() => open(`mailto:${c.contact_email}?subject=${encodeURIComponent(subject || `Message from ${me.firm_name}`)}&body=${encodeURIComponent(body + sign)}`, c.id, "Email")}>
                        <Mail className="size-4" /> Email
                      </Button>
                      <Button size="sm" variant="outline" disabled={!c.contact_phone}
                        onClick={() => open(`https://wa.me/${digits(c.contact_phone ?? "")}?text=${encodeURIComponent(body + sign)}`, c.id, "WhatsApp")}>
                        <MessageCircle className="size-4" /> WhatsApp
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">Opens your own email app or WhatsApp with the message ready to send; each send is recorded below.</p>
          </div>
        </section>

        <section className={card}>
          <h2 className="border-b px-5 py-4 text-lg font-semibold">Daily digest</h2>
          <div className="space-y-3 p-5">
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">{digest || "Loading…"}</pre>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(digest); toast.success("Digest copied"); }}><Copy className="size-4" /> Copy</Button>
              <Button size="sm" variant="outline" disabled={!settings.notify_email}
                onClick={() => window.open(`mailto:${settings.notify_email}?subject=${encodeURIComponent(`${me.firm_name} daily digest`)}&body=${encodeURIComponent(digest)}`)}>
                <Mail className="size-4" /> Email to firm
              </Button>
              <Button size="sm" variant="outline" disabled={!settings.notify_phone}
                onClick={() => window.open(`https://wa.me/${digits(settings.notify_phone)}?text=${encodeURIComponent(digest)}`, "_blank", "noopener")}>
                <MessageCircle className="size-4" /> WhatsApp to firm
              </Button>
            </div>
          </div>
        </section>

        {me.isAdmin && (
          <section className={card}>
            <h2 className="border-b px-5 py-4 text-lg font-semibold">Notification settings</h2>
            <div className="space-y-4 p-5">
              <div><Label className="mb-1.5 block">Firm notification email</Label><Input type="email" value={settings.notify_email} onChange={(e) => setSettings({ ...settings, notify_email: e.target.value })} /></div>
              <div><Label className="mb-1.5 block">Firm WhatsApp number</Label><Input value={settings.notify_phone} onChange={(e) => setSettings({ ...settings, notify_phone: e.target.value })} placeholder="98XXXXXXXX" /></div>
              <div><Label className="mb-1.5 block">Sender name on messages</Label><Input value={settings.notify_from_name} onChange={(e) => setSettings({ ...settings, notify_from_name: e.target.value })} placeholder={me.firm_name} /></div>
              <Button disabled={saveSettings.isPending} onClick={() => saveSettings.mutate()}>Save settings</Button>
            </div>
          </section>
        )}

        {me.isManager && (
          <section className={card}>
            <h2 className="border-b px-5 py-4 text-lg font-semibold">Recent messages</h2>
            <ul className="divide-y">
              {log.data?.map((m) => (
                <li key={m.id} className="px-5 py-3 text-sm">
                  <div className="flex justify-between"><span className="font-medium">{m.clients?.name ?? "—"} · {m.channel}</span><span className="text-xs text-muted-foreground">{fmtDate(m.created_at.slice(0, 10))}</span></div>
                  <p className="truncate text-muted-foreground">{m.body}</p>
                </li>
              ))}
              {log.data?.length === 0 && <li className="px-5 py-6 text-sm text-muted-foreground">Nothing sent yet.</li>}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
