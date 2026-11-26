# Go Kite · Interview Feedback App

A modern interview scheduling and candidate feedback web application for Go Kite Travel & Tours.

## Features

- 📅 **Interview Scheduling**: Schedule multi-round interviews with customizable round names, interviewers, and timestamps.
- 📹 **Google Meet Integration**: Add Google Meet links per round; accessible by interviewers with one click.
- 📄 **CV / Resume Upload**: Upload candidate resumes (PDF, DOC, images) attached directly to candidates and interview rounds.
- 💬 **Interviewer Feedback Portal**: Dedicated tokenized feedback links (`/f/[token]`) for interviewers to record recommendations (Proceed, Hold, Reject) and notes.
- 💼 **HROps**: Includes Full & Final (FNF) settlement and payslip generation with attendance, salary components, deductions, live previews, and PDF printing.
- 🔒 **Authentication**: Admin dashboard authentication with **Google OAuth 2.0** (with dev fallback for local testing).
- 📊 **Hiring Dashboard**: View candidate pipeline status (Scheduled, Shortlisted for next round, On Hold, Rejected) with candidate profiles and timeline history.

## Environment Variables

| Variable | Description |
|---|---|
| `AUTH_SECRET` | 32+ character random secret for JWT signing |
| `SUPER_ADMIN_EMAIL` | *(Optional)* Initial super admin email (defaults to `hrops@gokitetours.com`) |
| `DATABASE_URL` | PostgreSQL connection string (e.g. Neon Postgres) |
| `NEON_API_KEY` | Neon API key with read access to the project |
| `NEON_PROJECT_ID` | Neon project ID used to read the plan and storage capacity |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |

The configured super admin email is seeded into the database automatically. Only that account and admins explicitly added from **Super Admin** can access the workspace. Super admins can allocate active workspace modules to each admin individually. Set `SUPER_ADMIN_EMAIL` in production before the first deployment; it defaults to `hrops@gokitetours.com`. Development sign-in is disabled in production.

The **HROps** module is available from the workspace portal and contains **Full & Final Settlement (FNF)** and **Payslip Generator**. Both tools share employee folders: FNF settlements and payslips can be saved to a new or existing employee folder, reopened, updated, and deleted. An authorized admin can share an employee folder through the device share sheet where supported, or download a confidential PDF containing all saved FNF settlements and payslips. The PDF is generated on demand and is not published as a public link. Payslips support attendance and week-off calculations, editable earnings and deductions, and optional logos. Super admins can enable HROps workspace-wide and allocate it to individual admins.

## Getting Started

For local development, `DATABASE_URL` can be left unset; the app uses a local PGlite database in `.pgdata`. A fresh local database starts empty.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Production database

Production requires a persistent PostgreSQL database. Create a database (for example, on Neon), then add its connection string as `DATABASE_URL` in the hosting provider's production environment variables. On Vercel, configure it under **Project Settings → Environment Variables** and redeploy. Do not rely on the local PGlite database for production: production requests fail clearly if `DATABASE_URL` is missing or invalid rather than silently using temporary storage.

After deployment, verify the database connection at `/api/db-check`; it should report `Neon Serverless Postgres` and `status: connected`. Candidate, interview-round, and uploaded-file data are stored in that shared PostgreSQL database, so authorized users see the same records from different devices.

The Super Admin database storage tab reads current database size from PostgreSQL and plan capacity from the Neon API. Configure `NEON_API_KEY` and `NEON_PROJECT_ID` in the server environment. Free-plan projects show their 1 GB project allowance; usage-based Neon plans show that there is no fixed capacity.

The app no longer inserts sample candidates automatically. Existing records are not deleted when deploying this change; review and remove any old demo records from the production database separately if needed.
