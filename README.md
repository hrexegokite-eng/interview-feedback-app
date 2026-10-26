# Go Kite · Interview Feedback App

A modern interview scheduling and candidate feedback web application for Go Kite Travel & Tours.

## Features

- 📅 **Interview Scheduling**: Schedule multi-round interviews with customizable round names, interviewers, and timestamps.
- 📹 **Google Meet Integration**: Add Google Meet links per round; accessible by interviewers with one click.
- 📄 **CV / Resume Upload**: Upload candidate resumes (PDF, DOC, images) attached directly to candidates and interview rounds.
- 💬 **Interviewer Feedback Portal**: Dedicated tokenized feedback links (`/f/[token]`) for interviewers to record recommendations (Proceed, Hold, Reject) and notes.
- 👋 **Exit Interviews**: Build employee-specific exit forms, share private response links, and review submitted feedback in a separate employee profile and exit-interview history.
- 🔒 **Authentication**: Admin dashboard authentication with **Google OAuth 2.0** (with dev fallback for local testing).
- 📊 **Hiring Dashboard**: View candidate pipeline status (Scheduled, Shortlisted, On Hold, Rejected) with candidate profiles and timeline history.

## Environment Variables

| Variable | Description |
|---|---|
| `AUTH_SECRET` | 32+ character random secret for JWT signing |
| `ADMIN_EMAIL` | *(Optional)* Default admin email for local dev testing (e.g. `admin@gokite.com`) |
| `DATABASE_URL` | PostgreSQL connection string (e.g. Neon Postgres) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |

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

The app no longer inserts sample candidates automatically. Existing records are not deleted when deploying this change; review and remove any old demo records from the production database separately if needed.
