# SiteHisab — PRD

## Original Problem Statement
Contractor (Hindi/Hinglish) chalata hai 4 construction sites alag-alag companies me. Chahiye: labour ki hajari (full/half/absent), advance payment, monthly payment (din ke hisaab se, mahine ke end me), aur har site ka billing — Bill No, Bill Amount, GST/Non-GST, kitna payment aaya, kitna baaki, date. Har site ka supervisor roz ki report upload kare taaki owner har site ka hisaab bina phone kiye dekh sake.

## Architecture
- **Backend**: FastAPI + MongoDB (motor). JWT custom auth (bcrypt + pyjwt). Roles: owner, supervisor. Identifier = phone (unique). Soft deletes (deleted_at). All routes `/api` prefixed.
- **Frontend**: Expo Router (file-based), React Query for all server state, custom theme (SpaceGrotesk for numbers, PlusJakartaSans for text), Ionicons. Role-based route groups: `(owner)` tabs [Home, Team, Account], `(supervisor)` tabs [Sites, Account]; shared `site/[id]/*` stack screens.
- **Auth**: token in SecureStore; AuthContext gates `app/index.tsx` redirect.

## User Personas
1. **Owner / Thekedar** — manages all sites, billing, supervisors; sees aggregated dashboard.
2. **Supervisor** — logs in with owner-provided phone/password; sees only assigned sites; marks daily attendance & uploads report; can add bills/advances for assigned sites.

## Core Requirements (static)
- Multi-site management; per-site labour roster with daily wage.
- Daily attendance (full=1/half=0.5/absent=0) → auto daily report upload.
- Advances per labour; monthly payroll = wage×days − advances.
- Billing ledger with GST/Non-GST, received, balance, date.
- Bilingual Hindi+English UI.

## Implemented (2026-06)
- [x] JWT auth: owner register/login, supervisor create/login, RBAC (403 enforced).
- [x] Owner dashboard with totals + site cards + today's upload status.
- [x] Sites CRUD; Labourers CRUD.
- [x] Attendance screen with date navigator, segmented Full/Half/Absent, All Full/All Absent, save & upload.
- [x] Billing ledger (GST toggle, balance calc, edit/delete, summary).
- [x] Advances (labour picker, total, delete).
- [x] Monthly payroll with month navigator + net payable.
- [x] Daily reports history.
- [x] Team management (supervisors + site assignment).
- [x] Supervisor app with assigned-site-only access.
- Verified end-to-end by testing agent: 34/34 backend pass, all frontend flows pass.

## Backlog / Remaining
- **P1**: Export monthly payroll & billing to PDF/Excel for sharing with accountant.
- **P1**: WhatsApp share of a labour's monthly payslip.
- **P2**: Native date picker (currently YYYY-MM-DD text for bill/advance dates).
- **P2**: Edit/disable supervisor (currently add + delete only).
- **P2**: PIN lock on app open (user asked "dono option").
- **P2**: Per-labour advance history view & carry-forward balance across months.

## Next Tasks
- Payslip/report sharing (PDF + WhatsApp) — highest user value for a contractor.
- Native date pickers for faster entry.
