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
- Roles live only in `user_roles` (admin, team_leader, member, client); staff/client accounts are created by the admin via the `inviteUser` server function using app_metadata — prevents self-assigned privileges.
- Standard CRUD screens use the config-driven `ResourcePage` component — new registers are added as field/column configs, not bespoke pages.
- Statutory due-date and receivables-ageing rules live in `src/lib/compliance.ts` with unit tests — business rules stay pure and testable.
- This app is independent of the original cafh (Flask) repo; never modify cafh.
