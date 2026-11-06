<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Multi-tenant by `firm_id`; every app table carries it and RLS uses `my_firm_id()` / `is_staff()` / `my_client_id()` security-definer helpers — keeps firms and client portal users isolated without app-side checks.
- Roles live only in `user_roles` (super_admin, admin, team_leader, member, client); staff/client accounts are created by the admin via the `inviteUser` server function using app_metadata — prevents self-assigned privileges.
- Standard CRUD screens use the config-driven `ResourcePage` component — new registers are added as field/column configs, not bespoke pages.
- Statutory due-date and receivables-ageing rules live in `src/lib/compliance.ts` with unit tests — business rules stay pure and testable.
- This app is independent of the original cafh (Flask) repo; never modify cafh.
- Platform-owner (super_admin) operations live in `src/lib/platform.functions.ts`; each handler verifies the role first and only then loads the service-role client — cross-firm access stays server-side.
- Audit working-paper chapters/fields are data in `src/lib/audit-sections.ts` rendered generically and stored as JSON per engagement — new checklists need no new UI code.
- Suspended firms are blocked in the DB via `my_firm_id()` returning null — enforcement lives in RLS, not in UI checks.
- Engagement drill-down lives at `/engagement/$id` (tasks, hours, day logs); Word booklets are built in the browser with the `docx` package in `src/lib/booklet.ts` — no server-side document generation needed.
- Statutory due-date extensions (CBDT/ICAI/MCA) are per-firm rows keyed by FY + event key and passed into `generateCompliance` as overrides; MRL letter text lives in `src/lib/mrl-letters.ts` and curated library links in `src/lib/library-catalog.ts` — content stays data, pages stay generic.
- Combined imports and program application use authenticated SECURITY INVOKER database functions with firm-scoped locks — multi-row writes remain atomic, tenant-isolated and duplicate-safe.
- Audit programs store reusable procedure data per firm; checked-in starter procedures derive from the working-paper checklist rather than claiming to reproduce private cafh master templates.
