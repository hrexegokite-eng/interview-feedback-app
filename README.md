# Go Kite · Interview Feedback App

A modern interview scheduling and candidate feedback web application for Go Kite Travel & Tours.

## Features

- 📅 **Interview Scheduling**: Schedule multi-round interviews with customizable round names, interviewers, and timestamps.
- 📹 **Google Meet Integration**: Add Google Meet links per round; accessible by interviewers with one click.
- 📄 **CV / Resume Upload**: Upload candidate resumes (PDF, DOC, images) attached directly to candidates and interview rounds.
- 💬 **Interviewer Feedback Portal**: Dedicated tokenized feedback links (`/f/[token]`) for interviewers to record recommendations (Proceed, Hold, Reject) and notes.
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

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.
