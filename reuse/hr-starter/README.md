# HR Starter Project

This folder is a portable React + Vite + Supabase starting point for the Dirección de Bomberos Tijuana HR system. It is intentionally small: it provides wiring and generic utilities, not a finished HR product or approved access policy.

## Start

Move the whole `reuse/` directory into the new repository. Then either run this starter as a nested project or copy the **contents** of `hr-starter/` into the repository root.

1. In `hr-starter/` (or the new repository root after copying), run `npm ci` and `npm run dev`.
2. Copy `.env.example` to `.env.local`, then set the Supabase project URL and public anon/publishable key.
3. Review `supabase/migrations/0001_hr_foundation_template.sql` with the client and security reviewer before applying it. Personnel tables have RLS enabled and intentionally have no read/write policies, so they deny access until policies are designed.
4. Fill the role/permission matrix in `src/hooks/usePermissions.js` only after roles are confirmed. A missing permission mapping denies access.
5. Obtain the real source Excel workbooks and configure the parser's required fields and row validator before importing production data.

The app intentionally shows a configuration message instead of falling back to local demo data when Supabase is absent. Never put a Supabase service-role key in the frontend.

## Included starter files

- `src/context/AuthContext.jsx`, `src/pages/Login.jsx`, `src/components/RequireAuth.jsx`: Supabase session/sign-in wiring and protected app shell.
- `src/hooks/usePermissions.js`: deny-by-default permission placeholder.
- `src/lib/supabaseClient.js`: configured Supabase browser client and private-document signed URL/upload helpers.
- `src/lib/employeeFilters.js`: generic multi-field search and exact facet filtering.
- `src/lib/spreadsheetImport.js`, `src/components/EmployeeImportPreview.jsx`: ExcelJS/Papa Parse Excel/CSV parsing, required-field validation, duplicate checking helper, and preview-only import UI.
- `src/lib/reportExport.js`: generic Excel and PDF table exports.
- `supabase/migrations/0001_hr_foundation_template.sql`: minimal stations, user profiles/membership, employee identity, and dated assignment tables; no personnel policies are granted.

## Decisions still needed

Confirm station names and codes; employee identifier and data model; roles and field-level visibility; shift/assignment rules; account provisioning and recovery; sensitive document retention; actual spreadsheet formats; report definitions; and the government exchange format/API. Salary, injury, leave, and administrative-act information should not be added to broad employee rows without explicit access design. Consider separate tables or restricted views and audit exports/access according to policy.

## Production readiness

This starter is not production-ready until RLS and Storage policies have been implemented and tested, account administration is secured server-side, real import rules are validated, and restricted reports/documents have authorization and audit coverage. The browser permission hook is for UI behavior only; Postgres and Storage policies are the security boundary.
