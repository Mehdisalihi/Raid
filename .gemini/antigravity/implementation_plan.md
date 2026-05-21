# Audit and Fix Application Errors

## Goal Description

Perform a comprehensive audit of the full codebase (backend, web, mobile, desktop) to identify syntax errors, runtime issues, incomplete TODOs, and missing implementations. Resolve critical and minor bugs, complete unfinished features, and ensure the application builds and runs successfully.

## User Review Required

> [!IMPORTANT]
> Review the proposed steps and confirm if you want us to proceed with the full audit and fixes. If you have specific priority areas (e.g., only web dashboard, or focus on mobile), let us know.

## Open Questions

- Are there any specific features or sections you consider highest priority?
- Do you want automated tests to be added/updated as part of this process?
- Should we focus on production build readiness or just local dev functionality?

## Proposed Changes

### Backend
- Run `npm install` and `npm run lint` (if lint script exists) to detect JS/TS issues.
- Execute the server (`node packages/backend/src/app.js`) to verify startup and route health.
- Check for missing env variables and fix config errors.
- Resolve any TODO comments in generated TypeScript definitions.

### Web
- Install dependencies (`npm install` in `packages/web`).
- Run the development server (`npm run dev`).
- Scan console for runtime errors, missing imports, broken components.
- Address any TODOs or incomplete UI elements, especially in dashboard pages.
- Ensure all pages have proper SEO tags and responsive design.

### Mobile (Flutter/Dart)
- Use `dart analyze` via MCP `mcp_dart-mcp-server_analyze_files` to find analysis issues.
- Run `flutter pub get` and `flutter run` on a device/emulator.
- Fix type errors, missing `await`s, and incomplete TODOs.
- Verify localisation files are loaded correctly.

### Desktop (if any)
- Similar steps as web/backend.

### General
- Run all existing unit/integration tests (`npm test` or `flutter test`).
- Add missing error handling and logging.
- Clean up duplicate code and dead imports.
- Update README with build/run instructions.

## Verification Plan

### Automated Tests
- Run `npm test` for backend and web.
- Run `flutter test` for mobile.

### Manual Verification
- Start each service locally and manually navigate critical UI flows:
  - Dashboard KPI cards, quick actions.
  - Product, sales, invoices pages.
  - Mobile screens for sales, reports, statements.
- Capture screenshots/video of successful pages.

Once approved, we'll proceed with the audit and fixes step‑by‑step, updating `task.md` to track progress.
