# SiteHisab — PRD (Solo Contractor Edition)

## Original Problem Statement
Contractor (Hindi/Hinglish) chalata hai 4 construction sites alag-alag companies me. Chahiye: labour ki hajari (full/half/absent), advance payment, monthly payment (din ke hisaab se, mahine ke end me), aur har site ka billing — Bill No, Bill Amount, GST/Non-GST, kitna payment aaya, kitna baaki, date. 
User clarification: "Muje supervisor ko nahi dena app srif mere pass ragega" — The app is strictly for the contractor's personal phone only. All 4 sites, hajari, payments, advances, and a master billing ledger are managed directly by the contractor in a single unified interface.

## Architecture
- **Backend**: FastAPI + MongoDB (motor). JWT custom auth (bcrypt + pyjwt). Role: owner. Identifier = phone (unique). Soft deletes (deleted_at). All routes `/api` prefixed.
- **Frontend**: Expo Router (file-based), React Query for server state, custom theme (SpaceGrotesk for monetary & numbers, PlusJakartaSans for reading text), Ionicons.
- **Navigation (Contractor Tabs)**:
  1. `Home` (`app/(owner)/index.tsx`): 4 sites overview, total outstanding, billed, received, labour cost, today's attendance summary.
  2. `All Bills` (`app/(owner)/billing.tsx`): Master consolidated ledger of all bills across all sites with GST/Non-GST and site filters.
  3. `Account` (`app/(owner)/account.tsx`): Contractor profile, logout.
- **Per-Site Workflows** (`app/site/[id]/*`):
  - Attendance (Full/Half/Absent single-tap segmented control + All Full / All Absent shortcuts).
  - Labourers (Roster with daily wage rates).
  - Monthly Payroll (Earned − Advances = Net Payable calculation).
  - Advances (Per-worker advance ledger).
  - Site Billing (GST toggle, received, balance, date).
  - Reports (Daily summary logs).

## Implemented
- [x] Solo Contractor Architecture — streamlined purely for the owner.
- [x] Master All Bills Tab (`/bills`) with GST / Non-GST and site filters.
- [x] Security Audit passed (39/39 backend pytests + complete frontend flow verified).
- [x] Instant mobile testing via QR Code (Expo Go).

## Backlog / Enhancements
- **P1**: Export monthly payroll & billing to PDF/Excel for sharing with accountant.
- **P1**: WhatsApp share of a labour's monthly payslip.
- **P2**: App PIN Lock on opening.
- **P2**: Native calendar/date picker.
