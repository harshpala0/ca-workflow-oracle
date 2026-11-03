CREATE TABLE public.compliance_due_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  financial_year text NOT NULL,
  event_key text NOT NULL,
  due_date date NOT NULL,
  source text NOT NULL DEFAULT 'CBDT',
  notification_ref text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, financial_year, event_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_due_overrides TO authenticated;
GRANT ALL ON public.compliance_due_overrides TO service_role;
ALTER TABLE public.compliance_due_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read" ON public.compliance_due_overrides FOR SELECT TO authenticated USING (firm_id = public.my_firm_id() AND public.is_staff());
CREATE POLICY "managers write" ON public.compliance_due_overrides FOR ALL TO authenticated USING (firm_id = public.my_firm_id() AND public.is_firm_manager()) WITH CHECK (firm_id = public.my_firm_id() AND public.is_firm_manager());

CREATE TABLE public.library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  category text NOT NULL DEFAULT 'Firm material',
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_items TO authenticated;
GRANT ALL ON public.library_items TO service_role;
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read" ON public.library_items FOR SELECT TO authenticated USING (firm_id = public.my_firm_id() AND public.is_staff());
CREATE POLICY "managers write" ON public.library_items FOR ALL TO authenticated USING (firm_id = public.my_firm_id() AND public.is_firm_manager()) WITH CHECK (firm_id = public.my_firm_id() AND public.is_firm_manager());