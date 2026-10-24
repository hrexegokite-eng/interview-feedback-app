# Go Kite · Interview Feedback App

A modern interview scheduling and candidate feedback web application for Go Kite Travel & Tours.

## Features

- 📅 **Interview Scheduling**: Schedule multi-round interviews with customizable round names, interviewers, and timestamps.
- 📹 **Google Meet Integration**: Add Google Meet links per round; accessible by interviewers with one click.
- 📄 **CV / Resume Upload**: Upload candidate resumes (PDF, DOC, images) attached directly to candidates and interview rounds.
- 💬 **Interviewer Feedback Portal**: Dedicated tokenized feedback links (`/f/[token]`) for interviewers to record recommendations (Proceed, Hold, Reject) and notes.
- 🔒 **Authentication**: Admin dashboard authentication with password or **Google OAuth 2.0**.
- 📊 **Hiring Dashboard**: View candidate pipeline status (Scheduled, Shortlisted, On Hold, Rejected) with candidate profiles and timeline history.

## Environment Variables

| Variable | Description |
|---|---|
| `AUTH_SECRET` | 32+ character random secret for JWT signing |
| `ADMIN_EMAIL` | Default admin email (e.g. `admin@gokite.com`) |
| `ADMIN_PASSWORD` | Default admin login password |
| `DATABASE_URL` | PostgreSQL connection string (e.g. Neon Postgres) |
| `GOOGLE_CLIENT_ID` | *(Optional)* Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | *(Optional)* Google OAuth Client Secret |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.
