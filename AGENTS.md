<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Frontend-only prototype: no backend, database, real payments or SMS. "Server" behaviour is simulated in
  small modules so it can be swapped for real APIs later:
  `src/lib/mpesa.ts` (STK push + idempotent callback handler; orders become PAID only there),
  `src/lib/tokens.ts` (signed, expiring admission links; demo key, real signing belongs on a server),
  `src/lib/admission.ts` (door validation, ordering SMS send/resend), `src/lib/simulate.ts` (incoming orders),
  `src/lib/activity.ts` (notifications feed derived from orders, requests and SMS).
- Central mock data: `src/lib/data.ts` (cinemas, 27-item catalogue with photos/options, campaigns, stock),
  `src/lib/bookings.ts` (mock tickets incl. the sample e-ticket ANGA-93941518), `src/lib/schedule.ts` (screenings).
  Never hardcode product or booking data in components.
- Shared state lives in `src/lib/store.ts` (localStorage stores via useSyncExternalStore); guest pages, `/staff`,
  `/admissions` and `/demo` (iframes) read the same stores, so everything syncs across screens and tabs.
- Business rules are pure functions in `src/lib/rules.ts`, tested in `src/test/*.test.ts`; change rules there.
- Pages that read localStorage gate rendering on `useHydrated()` to avoid SSR hydration mismatches.
- Design system: premium dark everywhere (staff too). Tokens in `src/styles.css`: ANGA Blue #0757B5 for actions,
  ANGA Yellow #FFD900 for selection/highlights, Manrope headings + Inter text. Use tokens, not raw colours.
  Official logo: `public/brand/` (use `<AngaLogo>`), never recreate it in CSS.
- Routes: guest `/` → `/show` → `/seat` → `/menu` → `/cart` → `/pay` → `/order/$id`; entries `/t/$token`
  (admission SMS), `/q/$code` (seat QR), `/scan`, `/sms`, `/booking`, `/promo`, `/miniapp`;
  staff `/staff?view=overview|orders|fulfilment|notifications|settings`, `/admissions`, `/signage`; demo `/demo`.
