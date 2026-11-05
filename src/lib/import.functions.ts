import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { bulkSchema, importDeadlines, programSchema } from "./import-rules";
import type { Json } from "@/integrations/supabase/types";

export const importClients = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => bulkSchema.parse(input)).handler(async ({ data, context }) => {
  const { data: extensions, error: extError } = await context.supabase.from("compliance_due_overrides").select("event_key,due_date").eq("financial_year", data.financial_year);
  if (extError) throw new Error(extError.message);
  const overrides = Object.fromEntries((extensions ?? []).map(x => [x.event_key, x.due_date]));
  const rows = data.rows.map(row => ({ ...row, deadlines: importDeadlines(data.financial_year, row.packs, overrides) }));
  const { data: result, error } = await context.supabase.rpc("import_clients_engagements", { _fy: data.financial_year, _rows: rows as unknown as Json });
  if (error) throw new Error(error.message);
  return result as Record<string, number>;
});

export const saveAuditProgram = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => programSchema.parse(input)).handler(async ({ data, context }) => {
  const { data: firm, error: firmError } = await context.supabase.rpc("my_firm_id");
  if (firmError || !firm) throw new Error("Active firm required");
  const { data: result, error } = await context.supabase.from("audit_programs").insert({ ...data, items: data.items as Json, firm_id: firm, created_by: context.userId }).select("id").single();
  if (error) throw new Error(error.message);
  return result;
});

export const applyAuditProgram = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ program_id: z.string().uuid(), engagement_ids: z.array(z.string().uuid()).min(1).max(100), item_indexes: z.array(z.number().int().min(0)).min(1).max(500) }).parse(input)).handler(async ({ data, context }) => {
  const { data: result, error } = await context.supabase.rpc("apply_audit_program", { _program_id: data.program_id, _engagement_ids: data.engagement_ids, _item_indexes: data.item_indexes });
  if (error) throw new Error(error.message);
  return result as Record<string, number>;
});