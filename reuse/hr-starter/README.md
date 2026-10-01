# HR Starter Project

This folder is a portable React + Vite + Supabase starting point for the Dirección de Bomberos Tijuana HR system. It includes a functional local-data MVP for the dashboard, employee directory, and station list. It is a prototype, not a production system or approved access policy.

## Start

Move the whole `reuse/` directory into the new repository. Then either run this starter as a nested project or copy the **contents** of `hr-starter/` into the repository root.

1. In `hr-starter/` (or the new repository root after copying), run `npm ci` and `npm run dev`.
2. The app runs without Supabase configuration using seeded demonstration records. Changes are stored in this browser's `localStorage` and are not shared with other users or devices.
3. To begin a later Supabase integration, copy `.env.example` to `.env.local`, set the Supabase project URL and public anon/publishable key, and design the access policies before connecting personnel data.
4. Review `supabase/migrations/0001_hr_foundation_template.sql` with the client and security reviewer before applying it. Personnel tables have RLS enabled and intentionally have no read/write policies, so they deny access until policies are designed.
5. Fill the role/permission matrix in `src/hooks/usePermissions.js` only after roles are confirmed. A missing permission mapping denies access.
6. Obtain the real source Excel workbooks and configure the parser's required fields and row validator before importing production data.

Never put a Supabase service-role key in the frontend. The current MVP does not implement authentication, authorization, or a shared database.

## Included starter files

- `src/context/AuthContext.jsx`, `src/pages/Login.jsx`, `src/components/RequireAuth.jsx`: Supabase session/sign-in wiring and protected app shell.
- `src/App.jsx`, `src/lib/demoData.js`: local dashboard, employee CRUD, station assignment, and seeded demonstration data.
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
