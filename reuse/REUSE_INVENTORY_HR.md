# Reuse Inventory for the Human Resources Management System

## Purpose

This document inventories the existing Bomberos Tijuana fleet application for reuse in a separate **Human Resources Management and Tracking System (Sistema de Gestión de Recursos Humanos)**. It records concrete source paths, exported functions, components, database patterns, and dependencies that can be adapted. It does not implement or prescribe new application code.

The existing app uses React 19, Vite, React Router, Supabase Auth/Postgres/Storage, Tailwind CSS, SheetJS, jsPDF, Recharts, Motion, and Lucide. The new project can reuse the architecture and interaction patterns, but should establish its own HR data model, privacy controls, routes, branding details, and role policy.

A portable scaffold with adapted starter files is included in [reuse/hr-starter/README.md](hr-starter/README.md). Copy the contents of that folder into the root of the new repository; the scaffold is intentionally deny-by-default until HR access policies are approved.

## New Project Context

- **Project:** Human Resources Management and Tracking System
- **Organization:** Dirección de Bomberos Tijuana
- **Representative:** Estefania Pulido
- **Team:** Alejandro Apodaca, Alicia Jordan, Alejandra Dominguez, Ivan Fernandez, Diego Varela
- **Population and organization:** 526 employees across 17 fire stations
- **Primary user:** HR administrator / office staff
- **Potential users:** Station commanders and government system administrators; permissions and access remain pending confirmation
- **Core records:** Employee profiles, station/role/shift assignments, vacations, permissions, salaries, licenses, injuries, leaves, administrative acts, and record histories
- **Key workflows:** Secure registration and search, data validation, bulk migration from Excel, station-level reports, employee history, account administration, and an export/synchronization path for the government system
- **Still to confirm:** Integration method, access roles, confidentiality rules, source spreadsheet formats, shift/unit structures, rotation practices, and which government system fields must be exchanged

## Highest-Value Reuse

| Reusable capability | Existing implementation | HR adaptation |
|---|---|---|
| Authenticated React application shell | [src/App.jsx](../src/App.jsx), [src/components/Layout.jsx](../src/components/Layout.jsx) | Replace fleet routes and navigation with employees, HR events, reports, and administration. |
| Supabase sign-in and session state | [src/context/AuthContext.jsx](../src/context/AuthContext.jsx), [src/pages/Login.jsx](../src/pages/Login.jsx), [src/components/RequireAuth.jsx](../src/components/RequireAuth.jsx) | Reuse the auth flow; add invitation, account lifecycle, password recovery, and secure profile management. |
| Role and permission hook pattern | [src/hooks/usePermissions.js](../src/hooks/usePermissions.js) | Rebuild roles around confirmed HR permissions; do not copy current role decisions or email allowlists. |
| Station-scoped relational access pattern | [supabase/migrations/20260214120000_init_schema.sql](../supabase/migrations/20260214120000_init_schema.sql) | Adapt stations, profiles, user-to-station membership, foreign keys, indexes, and RLS as a foundation. Re-author policies for HR confidentiality. |
| Catalog loading/cache hook pattern | [src/hooks/useUnidadesCatalog.js](../src/hooks/useUnidadesCatalog.js), [src/lib/unidadesCatalog.js](../src/lib/unidadesCatalog.js) | Rebuild as an employee/personnel repository and hook; retain the loading/error/refresh/event concepts where useful. Avoid copying the localStorage fallback for authoritative employee data. |
| Multi-field search and facet filters | [src/lib/unidadesFiltros.js](../src/lib/unidadesFiltros.js), [src/components/FilterSidebar.jsx](../src/components/FilterSidebar.jsx), [src/pages/Unidades.jsx](../src/pages/Unidades.jsx) | Adapt the searchable fields and facets to station, role, shift, employment status, and other approved HR criteria. |
| Employee-style detail and history layout | [src/pages/UnidadDetalle.jsx](../src/pages/UnidadDetalle.jsx) | Reuse the record-detail composition, tabs, activity/history presentation, edit states, and per-record export workflow. Replace all fleet-specific calculations and sections. |
| Spreadsheet import with preview and validation | [src/components/PadronImportModal.jsx](../src/components/PadronImportModal.jsx), [src/components/CargaMasivaMantenimientos.jsx](../src/components/CargaMasivaMantenimientos.jsx), [src/lib/mantenimientoExcelParser.js](../src/lib/mantenimientoExcelParser.js) | Reuse the staged import UX: file selection, parsing, preview, row correction, validation feedback, confirmation, and import result. Build new HR-specific parsers and duplicate keys. |
| PDF/XLSX report generation | [src/lib/exportar.js](../src/lib/exportar.js) | Reuse generic table exporters and adapt titles, columns, metadata, privacy, report filters, and institutional formatting. |
| Report analytics and visualizations | [src/pages/UnidadesEstadisticas.jsx](../src/pages/UnidadesEstadisticas.jsx), [src/components/DashboardFlotaCharts.jsx](../src/components/DashboardFlotaCharts.jsx), [src/lib/api/dashboardData.js](../src/lib/api/dashboardData.js) | Reuse charting, dashboard aggregation, and station-filtered export patterns; implement metrics from approved HR definitions. |
| Private document storage | [src/lib/supabaseClient.js](../src/lib/supabaseClient.js), [src/lib/api/unidadesRepo.js](../src/lib/api/unidadesRepo.js), [src/lib/storageBackupZip.js](../src/lib/storageBackupZip.js) | Reuse the signed-URL and upload approach for employee documents, with private buckets and stricter authorization, retention, and audit requirements. |
| Import audit logging | [src/lib/api/importacionesRepo.js](../src/lib/api/importacionesRepo.js), `importaciones_log` in [supabase/migrations/20260214120000_init_schema.sql](../supabase/migrations/20260214120000_init_schema.sql) | Adapt job/user/time/success/failure logging. Consider a broader audit log for sensitive HR record reads and changes. |

## Portable Starter Kit

Move the entire `reuse/` directory into the new repository to keep this inventory and the scaffold together. The runnable starter is [hr-starter/](hr-starter/): run it there as a nested project, or copy its contents to the new repository root. Its [README](hr-starter/README.md) covers setup and unresolved decisions.

Key adapted files included in the starter:

- [hr-starter/src/App.jsx](hr-starter/src/App.jsx), [hr-starter/src/main.jsx](hr-starter/src/main.jsx), [hr-starter/src/index.css](hr-starter/src/index.css): Minimal Vite/React shell with a protected workspace entry.
- [hr-starter/src/context/AuthContext.jsx](hr-starter/src/context/AuthContext.jsx), [hr-starter/src/pages/Login.jsx](hr-starter/src/pages/Login.jsx), [hr-starter/src/components/RequireAuth.jsx](hr-starter/src/components/RequireAuth.jsx): Supabase session/sign-in/profile checks; missing profile blocks entry.
- [hr-starter/src/hooks/usePermissions.js](hr-starter/src/hooks/usePermissions.js): Permission matrix placeholder that denies all permissions until explicitly configured.
- [hr-starter/src/lib/supabaseClient.js](hr-starter/src/lib/supabaseClient.js): Supabase browser singleton and private-document signed URL/upload helpers.
- [hr-starter/src/lib/employeeFilters.js](hr-starter/src/lib/employeeFilters.js): Configurable multi-field search and exact filter matching.
- [hr-starter/src/lib/spreadsheetImport.js](hr-starter/src/lib/spreadsheetImport.js), [hr-starter/src/components/EmployeeImportPreview.jsx](hr-starter/src/components/EmployeeImportPreview.jsx): ExcelJS/Papa Parse import parser, required-field checks, duplicate-key helper, and preview-only UI. Add client-approved field mappings/validation before import.
- [hr-starter/src/lib/reportExport.js](hr-starter/src/lib/reportExport.js): Generic PDF and XLSX table export functions; callers must enforce report permissions and omit restricted fields.
- [hr-starter/supabase/migrations/0001_hr_foundation_template.sql](hr-starter/supabase/migrations/0001_hr_foundation_template.sql): Minimal relational foundation for stations, profiles, station memberships, employee identities, and dated assignments. RLS is enabled with no personnel policies, so access is denied until policies are designed and reviewed.
- [hr-starter/package.json](hr-starter/package.json), [hr-starter/package-lock.json](hr-starter/package-lock.json), [hr-starter/.env.example](hr-starter/.env.example): Self-contained dependencies, lock, and public Supabase environment variable template.

## File-by-File Inventory

### Application setup, routing, and shell

- [package.json](../package.json): Scripts are `dev`, `build`, `lint`, and `preview`. Useful existing dependencies include `react`, `react-dom`, `react-router-dom`, `@supabase/supabase-js`, `xlsx`, `jspdf`, `jspdf-autotable`, `recharts`, `motion`, and `lucide-react`. The HR app can reuse the stack and select only the dependencies it needs.
- [vite.config.js](../vite.config.js), [eslint.config.js](../eslint.config.js): Existing Vite/React and lint configuration can serve as starting points; review project-specific settings before copying.
- [src/main.jsx](../src/main.jsx): React application mounting point and global stylesheet entry.
- [src/App.jsx](../src/App.jsx): `App` sets up `BrowserRouter`, `AuthProvider`, public login, protected routes, `RequireAuth`, and nested `Layout`. Reuse the routing/auth composition, not the current fleet route list.
- [src/components/Layout.jsx](../src/components/Layout.jsx): Shared authenticated page shell with `Navbar`, `MobileBottomNav`, `Outlet`, responsive content width, and footer.
- [src/components/Navbar.jsx](../src/components/Navbar.jsx): Navigation links, responsive desktop/mobile behavior, auth session check, and sign-out action. Replace `navItems` and visual identity as appropriate.
- [src/components/MobileBottomNav.jsx](../src/components/MobileBottomNav.jsx), [src/components/Dock.jsx](../src/components/Dock.jsx): Reusable responsive navigation controls.
- [src/components/RequireAuth.jsx](../src/components/RequireAuth.jsx): Route guard that displays loading, redirects unauthenticated users to `/login`, and currently bypasses the guard if Supabase is not configured. Do not use that bypass for production HR data.
- [src/index.css](../src/index.css): Tailwind import, theme colors, font tokens, and base page styles. Reuse the setup only if the new app intentionally shares the existing design language.
- [index.html](../index.html), [vercel.json](../vercel.json): HTML/Vercel deployment starting points; review application title, redirects, and deployment config before reuse.

### Authentication, roles, and authorization

- [src/context/AuthContext.jsx](../src/context/AuthContext.jsx): Exports `AuthProvider` and `useAuth`. Exposes the Supabase client, session, user, profile, loading, `signIn`, `signOut`, and `refreshProfile`; loads `profiles` on auth changes.
- [src/pages/Login.jsx](../src/pages/Login.jsx): Email/password sign-in form, validation and localized auth error messages. It does not provide account creation or full self-service account administration.
- [src/hooks/usePermissions.js](../src/hooks/usePermissions.js): Exports `resolveAppRole(profile, email)` and `usePermissions()`. It derives `role`, `isViewer`, `isAdmin`, and `canEdit`; current role names include `admin`, `viewer`, `operador`, and `coordinador_estacion`.
- [src/lib/dataSource.js](../src/lib/dataSource.js): `isSupabaseConfigured()` checks `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` and rejects placeholder values.
- [src/lib/supabaseClient.js](../src/lib/supabaseClient.js): `getSupabaseClient()` returns a configured singleton; `createSignedStorageUrl(bucketId, path, expiresSec)` produces a temporary signed URL for private Storage objects.
- Auth database patterns are in [supabase/migrations/20260214120000_init_schema.sql](../supabase/migrations/20260214120000_init_schema.sql): `profiles`, `user_estaciones`, `is_admin()`, `user_estacion_ids()`, `can_access_estacion(eid)`, and `can_access_unidad_row(u)` illustrate Supabase Auth linkage and station membership.
- [supabase/migrations/20260527120000_rls_lectura_flota.sql](../supabase/migrations/20260527120000_rls_lectura_flota.sql): Later policy changes and role helpers (`is_viewer()`, `can_write_flota()`) are important to review when adapting the history of policy evolution.

**Security cautions:** `usePermissions.js` includes hardcoded email-handle role lists and resolves a missing database profile to `admin` (except listed viewers). This is not appropriate for HR. More critically, the initial `profiles_update_own` policy in the first migration allows a user to update their own profile row and its `rol` field because its `WITH CHECK` verifies ownership but does not constrain role changes. Rebuild profile/role policies so users cannot self-promote; role assignment must be an explicit privileged operation. Frontend permission checks are not a security boundary; enforce all access in Postgres RLS and Storage policies. The later fleet migration broadens several fleet table reads to authenticated users, so do not transplant those policies to employee or sensitive HR tables. Salary, injury, leave, and administrative-act data may need separate tables or tightly controlled views/policies because row-level policies alone do not hide selected columns within a row. The client must never contain a Supabase service-role key.

**Account management gap:** The existing app supports login, logout, and profile loading, but no employee-facing or admin UI for invitations, user provisioning, role assignment, disabling accounts, or password recovery was found. Supabase Auth administrative operations must not be performed with privileged service credentials in the browser; design secure server-side/Edge Function workflows if needed.

### Station and personnel catalog foundation

- [supabase/migrations/20260214120000_init_schema.sql](../supabase/migrations/20260214120000_init_schema.sql): Relational schema foundation for `estaciones`, `profiles`, `user_estaciones`, UUID keys, foreign keys, timestamps, indexes, trigger functions, RLS, and Storage buckets. Fleet tables (`unidades`, `mantenimientos`, `combustible_cargas`, `mantenimiento_refacciones`) are domain-specific and should not be copied as the HR schema.
- [supabase/migrations/20260215120000_estaciones_catalogo.sql](../supabase/migrations/20260215120000_estaciones_catalogo.sql): Idempotent seed/upsert pattern for station names and codes. The current seed lists Central, Salvavidas, Delicias, and Est. 1–18; confirm the HR system's authoritative 17-station catalog with the client rather than copying this list.
- [src/lib/api/unidadesRepo.js](../src/lib/api/unidadesRepo.js): Repository pattern for Supabase selects, joins, row mapping, insert/update, and station lookups. Reusable functions include `fetchEstaciones()` and `resolveEstacionIdFlexible(nombreRaw, estaciones)`; most other functions are fleet-specific (`fetchUnidades`, `fetchUnidadById`, `insertUnidadDb`, `updateUnidadDb`, `mapUnidadRow`). The station-name normalizer it imports is [src/lib/estacionNormalize.js](../src/lib/estacionNormalize.js), whose station-specific canonical mappings should be reviewed before adaptation.
- [src/lib/unidadesCatalog.js](../src/lib/unidadesCatalog.js): Catalog state and change notification pattern: `getCatalogRaw`, `getUnidades`, `setUnidades`, `clearUnidadesCatalog`, `replaceUnidadesFromImport`, `mergeUnidadesFromImport`, `mergeUnidadesFromImportAsync`, `appendUnidadLocal`, `updateUnidadById`, and `refreshUnidadesRemote`. Rebuild around employee fields, approved unique identifiers, and authoritative database semantics; do not reuse its vehicle merge keys or production local fallback.
- [src/hooks/useUnidadesCatalog.js](../src/hooks/useUnidadesCatalog.js): `useUnidadesCatalog()` manages remote/local catalog loading, `refresh`, loading/error state, and the custom change event. Useful as a pattern for an employee-list hook or data-query layer.
- [src/data/mockUnidades.js](../src/data/mockUnidades.js), [src/data/mockMantenimientos.js](../src/data/mockMantenimientos.js), [src/data/mockCombustible.js](../src/data/mockCombustible.js): Demonstration data only. Do not migrate mock records into HR or use them as real employee records.

### Search, list, detail, and history interactions

- [src/lib/unidadesFiltros.js](../src/lib/unidadesFiltros.js): Exports `unidadTieneAseguranza`, `estadoSeguroUnidad`, `mapCategoriaOperativa`, `normalizeUnidad`, `emptyFilters`, `buildOptions`, and `filterUnidades`. `buildOptions` and `filterUnidades` provide reusable multi-facet filtering mechanics; insurance and operational-status normalization are fleet-specific.
- [src/components/FilterSidebar.jsx](../src/components/FilterSidebar.jsx): Generic filter panel receiving `groups`, `totalActive`, and `onClearAll`; includes mobile collapse and per-group rendering.
- [src/pages/Unidades.jsx](../src/pages/Unidades.jsx): Search query in URL parameters, filter state, result list, export action, and catalog navigation patterns. Cards and field labels are vehicle-specific.
- [src/pages/UnidadNueva.jsx](../src/pages/UnidadNueva.jsx): New-record form pattern including field layout, validation state, and save flow. Adapt the interaction patterns but create HR validation rules and field definitions.
- [src/pages/UnidadDetalle.jsx](../src/pages/UnidadDetalle.jsx): Detail-page pattern for route-param loading, record metadata, edit mode, tabs, linked histories, document access, and report exports. Rebuild all sections for employee profile, assignment history, leave/vacation records, licenses, injuries, and administrative acts.
- [src/lib/bitacoraServicios.js](../src/lib/bitacoraServicios.js): `buildBitacoraServicios(...)` merges fleet events into a chronological service log; the concept is reusable for a unified employee history, but the event types and shape are fleet-specific.
- [src/lib/api/bitacoraMovimientosRepo.js](../src/lib/api/bitacoraMovimientosRepo.js): `insertBitacoraMovimiento(payload)` and `fetchBitacoraMovimientosByUnidad(unidadId)` show an event-log repository pattern. HR audit/history needs a new employee-scoped model with actor, timestamp, event type, before/after data where authorized, and immutable/auditable semantics.
- [src/lib/unidadDisplay.js](../src/lib/unidadDisplay.js): Display label helpers such as `tituloUnidad`, `lineaEconomicoUnidad`, and `etiquetaUnidadLista` are useful only as a pattern; replace the vehicle-specific naming rules.

### Excel / CSV imports and validation

- [src/lib/excelUploadAccept.js](../src/lib/excelUploadAccept.js): `EXCEL_ACCEPT_INPUT`, `esArchivoExcelImportable(fileName)`, and `etiquetaFormatosExcel()` share accepted Excel/CSV extensions and validation.
- [src/lib/padronExcel.js](../src/lib/padronExcel.js): `findPadronSheetName`, `mapEstatusExcel`, and `parsePadronMasterFromBuffer(buffer)` demonstrate worksheet discovery, header checks, date/row mapping, and structured parser errors. Its padrón field mappings and vehicle normalization are not reusable as HR field mappings.
- [src/lib/padronBomberosExcel.js](../src/lib/padronBomberosExcel.js): `PADRON_BOMBEROS_MAP`, `mapDescripcionToTipo`, `isPadronBomberosHeader`, `parsePadronBomberosFromBuffer(buffer)`, `normalizeOficilia`, `normalizeVin`, and `normalizePlacas` illustrate fixed-column parsing and normalization; all field meanings are vehicle-specific.
- [src/lib/oficialiaInventarioExcel.js](../src/lib/oficialiaInventarioExcel.js): `parseOficialiaInventarioFromBuffer(buffer, fileName)`, `normalizeHeader` (private), `buildColumnMap` (private), and the exported normalizers `normalizeNumeroEconomico`, `normalizeVin`, `normalizePlacas`, `esNumeroEconomicoPlaceholder` (see module exports) illustrate flexible header aliases, CSV/Excel parsing, and format detection. Reuse the technique, not the aliases or normalization rules.
- [src/components/PadronImportModal.jsx](../src/components/PadronImportModal.jsx): File validation, parse state, preview metadata, merge/replace choice, confirmation, errors, and progress states. Its replace-all mode is local-only; HR imports should normally use reviewed, auditable upsert/append behavior and avoid destructive replace.
- [src/components/SincronizacionInventario.jsx](../src/components/SincronizacionInventario.jsx): Admin-only staged bulk import UX with duplicate report, row editing, required-field checks, confirmation, and result feedback. Reuse the workflow shape for initial employee migration after obtaining the real Excel layouts.
- [src/lib/api/sincronizacionInventarioImport.js](../src/lib/api/sincronizacionInventarioImport.js): `fetchIndiceUnidadesExistentes()`, `unidadYaExisteEnIndice(fila, indice)`, `filtrarUnidadesNuevas(filasExcel, indice)`, and `insertarUnidadesFaltantesBulk(filas)` provide duplicate indexing, matching criteria, required-field validation, bulk insertion, and import logging patterns. Replace all vehicle IDs and matching keys; define HR deduplication with the client (e.g. employee number, with explicit handling for missing/duplicate identifiers).
- [src/lib/mantenimientoExcelParser.js](../src/lib/mantenimientoExcelParser.js): `parseMantenimientoExcelFromBuffer(buffer, fileName)` demonstrates flexible column labels, date and number parsing, required columns, and row normalization. The repair-specific map and data fields do not transfer.
- [src/components/CargaMasivaMantenimientos.jsx](../src/components/CargaMasivaMantenimientos.jsx), [src/lib/api/mantenimientoBulkImport.js](../src/lib/api/mantenimientoBulkImport.js): Import preview, row-to-catalog matching, correction/reprocessing, anomaly/error views, and confirmation pattern. Existing implementation is strictly maintenance-domain.
- [src/lib/api/padronUnidadesImport.js](../src/lib/api/padronUnidadesImport.js), [src/lib/api/importacionesRepo.js](../src/lib/api/importacionesRepo.js): Server-side merge/upsert and import-run audit pattern. Review the exact conflict/transaction behavior before adapting.
- [supabase/migrations/20260214120002_importaciones_log_update.sql](../supabase/migrations/20260214120002_importaciones_log_update.sql): Migration for updating import-run records; relevant only if retaining the same import-log design.

**Recommended HR import checks:** required employee identifier, valid station/role/shift references, date-range validity, duplicate employee and assignment detection, enumeration constraints, missing/unknown values, and a reviewable row-level error report before any database commit. No real HR source spreadsheets are included in this repository, so parser formats cannot yet be specified.

### Reports, Excel/PDF exports, and dashboards

- [src/lib/exportar.js](../src/lib/exportar.js): Exports `exportarTablaPDF({...})` and `exportarTablaExcel({...})`. PDF supports title, subtitle, columns/rows, metadata, totals, and institutional signature blocks; Excel exports a worksheet with title, timestamp, columns, rows, and auto-sized widths. General-purpose and high-value to adapt. Review the PDF's current fixed Dirección/flota branding and prevent confidential fields from being exported inadvertently.
- [src/lib/padronExport.js](../src/lib/padronExport.js): `describeFiltrosPadron(filters, query)` and `exportPadronUnidades({ unidades, filters, query })` demonstrate including active filters and query scope in a spreadsheet report. Vehicle columns and naming are domain-specific.
- [src/pages/UnidadesEstadisticas.jsx](../src/pages/UnidadesEstadisticas.jsx): Aggregation by dimension, live filter-based charts, and PDF export of a single-station result set. Reuse the aggregation/report flow for approved station headcount or workforce reports.
- [src/components/DashboardFlotaCharts.jsx](../src/components/DashboardFlotaCharts.jsx): Recharts dashboard component for fleet-specific charting; use as a visual and chart composition reference.
- [src/lib/api/dashboardData.js](../src/lib/api/dashboardData.js): `fetchDashboardSnapshot()` shows concurrent Supabase reads, aggregation, date-window calculations, and recent activity formatting. Replace fleet queries and metrics entirely.
- [src/pages/ReporteServiciosUnidad.jsx](../src/pages/ReporteServiciosUnidad.jsx), [src/components/ReporteServiciosUnidadPanel.jsx](../src/components/ReporteServiciosUnidadPanel.jsx): Report period controls, filtering, metadata, totals, and institutional PDF export pattern. The underlying service report is not an HR report.
- [src/lib/pdfFirmasDefaults.js](../src/lib/pdfFirmasDefaults.js): `getPdfFirmasDefaults()` and related defaults pattern for persisted PDF signature names; only reuse if the HR report requires those signatures and the policy is approved.
- [src/pages/Mantenimiento.jsx](../src/pages/Mantenimiento.jsx), [src/pages/Combustible.jsx](../src/pages/Combustible.jsx): Search, date sorting, filtered exports, data summaries, and report action examples; their business logic remains fleet-specific.

**Report caution:** HR reports can contain salary, injury, leave, and disciplinary/administrative data. Treat report generation, download, print, and government export as authorization-controlled operations; include only fields each role is permitted to see, and consider export audit logging.

### File/document handling and backup

- [src/lib/api/unidadesRepo.js](../src/lib/api/unidadesRepo.js): The functions near the end of the module include `signedSeguroPdfUrl`, `signedFacturaUrl`, `signedReciboUrl`, `actualizarFotoUnidad`, and private-document upload helpers. These demonstrate Storage uploads and temporary signed URLs; bucket names, row associations, and fleet permissions are domain-specific.
- [src/lib/supabaseClient.js](../src/lib/supabaseClient.js): `createSignedStorageUrl(bucketId, path, expiresSec)` centralizes private object URL creation.
- [src/components/StorageBackupPanel.jsx](../src/components/StorageBackupPanel.jsx): Progress, cancellation, confirmation, and ZIP download UI pattern. Its destructive post-backup option is irreversible and fleet-specific; do not enable an equivalent for HR records without an approved retention/backup design.
- [src/lib/storageBackupZip.js](../src/lib/storageBackupZip.js): `buildStorageBackupZip({ scope, signal, onProgress })`, `isEstadoOperativo(estado)`, and `downloadBlob(blob, fileName)` show ZIP backup, progress, cancellation, and browser download techniques. Vehicle folder layout and database cleanup are not reusable; HR export/backup must have an explicit privacy and retention policy.
- [supabase/migrations/20260214120000_init_schema.sql](../supabase/migrations/20260214120000_init_schema.sql): Creates `unidades-fotos` (public) and `documentos-privados` (private) buckets. HR documents should be private; review/rewrite all Storage object policies and use short-lived signed URLs. Do not place medical or disciplinary files in a public bucket.

### Existing pages/components with reusable UI patterns

- [src/components/Stepper.jsx](../src/components/Stepper.jsx): Multi-step flow component pattern; useful for employee onboarding or an import wizard.
- [src/components/BulkRegistroModal.jsx](../src/components/BulkRegistroModal.jsx): Bulk data-entry modal pattern.
- [src/components/MantenimientoModal.jsx](../src/components/MantenimientoModal.jsx), [src/components/CombustibleModal.jsx](../src/components/CombustibleModal.jsx): Form/modal patterns with validation and Supabase-backed saves; business fields are fleet-specific.
- [src/components/PadronImportModal.jsx](../src/components/PadronImportModal.jsx): Import dialog and preview states.
- [src/components/FilterSidebar.jsx](../src/components/FilterSidebar.jsx): Filter panel mechanics, reusable when filters are data-driven.
- [src/components/RequireAuth.jsx](../src/components/RequireAuth.jsx): Auth route handling only; role-level route guard should be designed separately.

## Database Migration Inventory

The migration sequence is useful as architecture history, not as a schema to apply wholesale to a new HR database:

- [20260214120000_init_schema.sql](../supabase/migrations/20260214120000_init_schema.sql): Initial fleet schema, stations, profiles, station membership, timestamps, RLS helpers, import log, Storage buckets, and initial policies.
- [20260214120001_unidades_seguro_pdf_nombre.sql](../supabase/migrations/20260214120001_unidades_seguro_pdf_nombre.sql): Vehicle insurance/document fields; fleet-only.
- [20260214120002_importaciones_log_update.sql](../supabase/migrations/20260214120002_importaciones_log_update.sql): Import log change; inspect if adapting import audit.
- [20260215120000_estaciones_catalogo.sql](../supabase/migrations/20260215120000_estaciones_catalogo.sql): Station reference data and idempotent upsert pattern.
- [20260216120000_combustible_xiga.sql](../supabase/migrations/20260216120000_combustible_xiga.sql): Fuel-import fields; fleet-only.
- [20260525120000_unidades_poliza_express.sql](../supabase/migrations/20260525120000_unidades_poliza_express.sql): Vehicle insurance workflow; fleet-only.
- [20260526120000_bitacora_operativa_rbac.sql](../supabase/migrations/20260526120000_bitacora_operativa_rbac.sql): Adds `viewer`, a fleet event table, RLS, and hardcoded handle examples; event-log/RBAC concepts only, not policy to copy.
- [20260526140000_urls_drive_documentos.sql](../supabase/migrations/20260526140000_urls_drive_documentos.sql): External document URL fields; inspect only if the HR government/document workflow calls for URL references.
- [20260527120000_rls_lectura_flota.sql](../supabase/migrations/20260527120000_rls_lectura_flota.sql): Later fleet read/write policy changes; review specifically to understand that the effective permissions differ from the initial migration. Do not apply these broad read rules to HR data.

For the HR design, agree on roles and access matrix first, then build a separate relational schema. Likely entities to discuss include employees, stations, position/role catalog, shifts, dated assignments, HR event/history, vacation/leave/permission requests, licenses, injuries, salary records, administrative acts, and account/profile membership. This list is a design checklist, not a final schema; confidentiality boundaries, historical rules, and source data require client confirmation.

## Existing Utilities to Exclude from Direct Reuse

The following source files are useful only as examples or are specific to the fleet product. Do not copy their business rules into the HR app:

- [src/lib/combustible.js](../src/lib/combustible.js), [src/lib/mantenimientos.js](../src/lib/mantenimientos.js), [src/lib/mantenimientoBulkUtils.js](../src/lib/mantenimientoBulkUtils.js): Fuel, maintenance, repair, and invoice rules.
- [src/lib/xigaCombustibleParser.js](../src/lib/xigaCombustibleParser.js), [src/lib/xigaUnidadesCatalogo.js](../src/lib/xigaUnidadesCatalogo.js): XIGA/fuel and vehicle catalog matching.
- [src/lib/segurosResumen.js](../src/lib/segurosResumen.js), [src/lib/polizaExpress.js](../src/lib/polizaExpress.js), [src/lib/polizaEnlacesParser.js](../src/lib/polizaEnlacesParser.js): Insurance/policy handling.
- [src/lib/fotosUnidadesParser.js](../src/lib/fotosUnidadesParser.js), [src/lib/oficialiaInventarioExcel.js](../src/lib/oficialiaInventarioExcel.js), [src/lib/padronExcel.js](../src/lib/padronExcel.js), [src/lib/padronBomberosExcel.js](../src/lib/padronBomberosExcel.js): Fleet and Officialia file formats.
- [src/pages/Combustible.jsx](../src/pages/Combustible.jsx), [src/pages/Mantenimiento.jsx](../src/pages/Mantenimiento.jsx), [src/pages/PolizasSeguroConsola.jsx](../src/pages/PolizasSeguroConsola.jsx), [src/pages/SiniestrosExpress.jsx](../src/pages/SiniestrosExpress.jsx): Fleet product pages.
- [src/data/mockUnidades.js](../src/data/mockUnidades.js), [src/data/mockCombustible.js](../src/data/mockCombustible.js), [src/data/mockMantenimientos.js](../src/data/mockMantenimientos.js), [src/data/mockPolizasExpress.js](../src/data/mockPolizasExpress.js): Demo-only fleet content.
- [public/fotos-unidades/](../public/fotos-unidades/): Vehicle images and assets; not HR assets.
- [supabase/seed.sql](../supabase/seed.sql): Existing fleet/station development seed; verify before any reuse.

## Suggested Reuse Order

1. Start a separate app/repository or clearly separated project so fleet data and HR data do not share tables or permissive policies.
2. Reuse the package stack, route shell, Supabase client/auth patterns, and generic UI components selectively.
3. Confirm the 17 stations, position/role vocabulary, shift model, employee identifiers, and assignment/history rules with HR.
4. Define the HR role/field access matrix and implement/test database RLS and private Storage policies before importing sensitive data.
5. Build an HR-specific employee catalog/detail/history model and searchable list; keep salary, medical, and administrative-act access distinct as required.
6. Obtain the real spreadsheets and map each source file to an import parser, validation rules, duplicate policy, preview, import log, and reconciliation report.
7. Build station and global reports from approved data, with export permissions and audit records.
8. Add secure account provisioning, role/station assignment, password recovery, and account disablement flows; do not rely on developer intervention for routine administration.
9. Confirm the government linkage with the client. A versioned CSV/XLSX export may be a first integration boundary if approved; do not assume a direct API exists.
10. Verify data integrity, station-level authorization, access to restricted fields/documents, import idempotency, report accuracy, and user acceptance against the project criteria.

## Verification Note

This inventory was assembled by reading the current React app, its Supabase migrations, and import/report/auth modules. It documents reusable candidates and adaptation guidance only; it does not certify that current fleet authorization is sufficient for HR data or that the 17-station source list matches the HR client's authoritative structure.
