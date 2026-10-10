import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, StatusBadge } from "@/components/ui-bits";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export interface Field {
  name: string;
  label: string;
  type?: "text" | "textarea" | "date" | "number" | "select" | "ref";
  options?: string[];
  ref?: { table: string; label: string; filter?: Record<string, unknown> };
  required?: boolean;
  default?: string | number;
  full?: boolean;
}

export interface Column {
  key: string;
  label: string;
  render?: (row: Row) => ReactNode;
  status?: boolean;
  money?: boolean;
  align?: "right";
}

interface Props {
  table: string;
  title: string;
  description?: string;
  select?: string;
  orderBy?: string;
  ascending?: boolean;
  fields: Field[];
  columns: Column[];
  searchKeys: string[];
  filters?: { key: string; options: string[] };
  canEdit?: boolean;
  rowActions?: (row: Row) => ReactNode;
  headerExtra?: ReactNode;
  transform?: (values: Row) => Row;
}

function useRefOptions(field: Field) {
  return useQuery({
    queryKey: ["ref", field.ref?.table, field.ref?.label],
    enabled: !!field.ref,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from(field.ref!.table as any) as any)
        .select(`id, ${field.ref!.label}`)
        .order(field.ref!.label);
      return (data ?? []) as Row[];
    },
  });
}

function RefSelect({ field, value, onChange }: { field: Field; value: string; onChange: (v: string) => void }) {
  const { data = [] } = useRefOptions(field);
  return (
    <select
      className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
    >
      <option value="">— Select —</option>
      {data.map((o) => (
        <option key={o["id"]} value={o["id"]}>
          {o[field.ref!.label]}
        </option>
      ))}
    </select>
  );
}

export function ResourcePage(p: Props) {
  const me = useMe();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const canEdit = p.canEdit ?? me.isStaff;

  const list = useQuery({
    queryKey: [p.table, "list"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from(p.table as any) as any)
        .select(p.select ?? "*")
        .order(p.orderBy ?? "created_at", { ascending: p.ascending ?? false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const rows = useMemo(() => {
    const term = q.toLowerCase();
    return (list.data ?? []).filter((r) => {
      if (filter && p.filters && r[p.filters.key] !== filter) return false;
      if (!term) return true;
      return p.searchKeys.some((k) => {
        const v = k.split(".").reduce<unknown>((o, kk) => (o as Row | null)?.[kk], r);
        return String(v ?? "").toLowerCase().includes(term);
      });
    });
  }, [list.data, q, filter, p.filters, p.searchKeys]);

  const save = useMutation({
    mutationFn: async (values: Row) => {
      const clean: Row = {};
      for (const f of p.fields) {
        const v = values[f.name];
        clean[f.name] = v === "" || v === undefined ? null : f.type === "number" ? Number(v) : v;
      }
      const payload = p.transform ? p.transform(clean) : clean;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tbl = supabase.from(p.table as any) as any;
      const { error } = values["id"]
        ? await tbl.update(payload).eq("id", values["id"])
        : await tbl.insert({ ...payload, firm_id: me.firm_id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: [p.table] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(p.table as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: [p.table] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const blank = () => Object.fromEntries(p.fields.map((f) => [f.name, f.default ?? ""]));

  return (
    <div>
      <PageHeader
        title={p.title}
        description={p.description}
        actions={
          <>
            {p.headerExtra}
            {canEdit && (
              <Button onClick={() => setEditing(blank())}>
                <Plus className="size-4" /> Add
              </Button>
            )}
          </>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {p.filters && (
          <select
            className="h-9 rounded-md border border-input bg-card px-3 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All</option>
            {p.filters.options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        )}
        <span className="ml-auto self-center text-sm text-muted-foreground">{rows.length} records</span>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {p.columns.map((c) => (
                <th key={c.key} className={`px-4 py-3 font-medium ${c.align === "right" ? "text-right" : ""}`}>
                  {c.label}
                </th>
              ))}
              {(canEdit || p.rowActions) && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {list.isLoading && (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={99}>
                  Loading…
                </td>
              </tr>
            )}
            {!list.isLoading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-muted-foreground" colSpan={99}>
                  Nothing here yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r["id"]} className="border-t hover:bg-muted/30">
                {p.columns.map((c) => {
                  const v = c.key.split(".").reduce<unknown>((o, k) => (o as Row | null)?.[k], r);
                  return (
                    <td key={c.key} className={`px-4 py-3 ${c.align === "right" || c.money ? "text-right tabular" : ""}`}>
                      {c.render
                        ? c.render(r)
                        : c.status
                          ? <StatusBadge value={String(v ?? "")} />
                          : c.money
                            ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(v ?? 0))
                            : String(v ?? "—")}
                    </td>
                  );
                })}
                {(canEdit || p.rowActions) && (
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    {p.rowActions?.(r)}
                    {canEdit && (
                      <>
                        <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(r)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Delete"
                          onClick={() => confirm("Delete this record?") && del.mutate(r["id"])}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.["id"] ? "Edit" : "Add"} — {p.title}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(editing);
              }}
            >
              {p.fields.map((f) => {
                const val = editing[f.name] ?? "";
                const set = (v: string) => setEditing({ ...editing, [f.name]: v });
                return (
                  <div key={f.name} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
                    <Label className="mb-1.5 block">
                      {f.label}
                      {f.required && <span className="text-destructive"> *</span>}
                    </Label>
                    {f.type === "textarea" ? (
                      <Textarea value={val} onChange={(e) => set(e.target.value)} required={f.required} />
                    ) : f.type === "select" ? (
                      <select
                        className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        required={f.required}
                      >
                        {!f.required && <option value="">—</option>}
                        {f.options!.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : f.type === "ref" ? (
                      <RefSelect field={f} value={val} onChange={set} />
                    ) : (
                      <Input
                        type={f.type ?? "text"}
                        step={f.type === "number" ? "any" : undefined}
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        required={f.required}
                      />
                    )}
                  </div>
                );
              })}
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
