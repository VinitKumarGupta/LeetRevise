<div align="center">

# ⚡ LeetRevise

**Master algorithmic patterns through intelligent, adaptive spaced repetition.**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br />

<p align="center">
  <a href="#about-the-project">About</a> •
  <a href="#core-features">Core Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#api-endpoints--cron">API & Cron</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

</div>

---

## About the Project

Software engineers frequently solve hundreds of LeetCode problems only to forget foundational patterns—such as dynamic programming state transitions, monotonic stack invariants, or topological sorting templates—weeks later.

**LeetRevise** bridges the retention gap by replacing passive re-solving with an **adaptive, 6-stage spaced repetition schedule**. The platform automatically synchronizes your accepted LeetCode submissions, calculates mathematically optimal milestone review dates, prioritizes high-impact scheduled revisions, and delivers a curated daily digest straight to your inbox so your problem-solving intuition remains sharp.

<div align="center">
  <img src="screenshots/Dashboard.png" alt="LeetRevise Application Dashboard showing solve consistency graph, difficulty breakdown, streak metrics, and recent revisions" width="900" style="border-radius: 10px; border: 1px solid #30363d;" />
</div>

---

## Core Features

- **Automated LeetCode Sync with Import Throttling:** Connect your public LeetCode handle to fetch accepted submissions via GraphQL. Syncs are capped at the **6 most recent new problems** per sync to avoid overwhelming the revision queue after long breaks, complemented by manual URL/slug fallbacks for custom problem tracking.
- **Adaptive 6-Stage Spaced Repetition (SRS):** Dynamic interval expansion ($1\text{d} \to 3\text{d} \to 7\text{d} \to 14\text{d} \to 30\text{d} \to 90\text{d}$) that dynamically advances, maintains, or resets stages based on self-reported recall performance.
- **Multi-Tier Priority Classification:** Intelligent 6-tier classification algorithm prioritizes active scheduled revisions due today over older unreviewed imports, ensuring urgent recall cycles are never buried under long-overdue backlog items.
- **Curated Daily Email Digests with Backlog Surfacing:** Automated transactional email reminders via Brevo (Sendinblue). Reminders send up to 3 prioritized active scheduled revisions and dynamically surface up to 2 older backlog problems in a dedicated **"📦 From Your Backlog"** section with relative time stamps (*e.g., "Solved 18 days ago · Never reviewed"*), preventing historical problems from being permanently ignored.
- **Interactive Consistency & Performance Analytics:**
  - **Weekly Solve Consistency:** 6-week bar graph featuring clear, unambiguous date-range tooltips (*e.g., "Oct 25 – Oct 31, 2026"*) on hover.
  - **Difficulty Breakdown:** Visual percentage meters tracking Easy, Medium, and Hard problem distributions.
  - **Streaks & Retention:** Real-time streak tracking (current vs. personal best) with completion-rate metrics.
  - **Weak Spot Identification:** Analytics highlighting top forgotten topics to direct study efforts.
- **Community Leaderboard:** Real-time peer leaderboard comparing active revision streaks and total problem volume.
- **Cloud Reliability & Cold-Start Safeguards:** Integrated `/api/ping` keep-alive endpoint for cloud hosts (e.g., Render free tier) and `/api/health` diagnostics with database latency profiling.

---

## How It Works

### 1. Spaced Repetition Schedule

When a problem is synced, its initial review is scheduled for 1 day after the solved date. Subsequent review dates scale dynamically based on the review outcome:

| Review Stage | Interval | Approximate Milestone |
| :----------- | :------- | :-------------------- |
| **Stage 0**  | 1 day    | Initial Recall        |
| **Stage 1**  | 3 days   | Early Retention       |
| **Stage 2**  | 7 days   | 1-Week Checkpoint     |
| **Stage 3**  | 14 days  | 2-Week Consolidation  |
| **Stage 4**  | 30 days  | 1-Month Mastery       |
| **Stage 5**  | 90 days  | Long-Term Retention   |

### 2. Review Outcome Grading

| User Response | Stage Impact                         | Next Interval                                    |
| :------------ | :----------------------------------- | :----------------------------------------------- |
| **Easy**      | Advances to next stage ($\text{+1}$) | Interval increases to the new stage's target     |
| **Effort**    | Retains current stage                | Re-tested at the same stage interval             |
| **Forgot**    | Resets to Stage 0                    | Reset to 1-day interval for immediate recall     |
| **Skipped**   | Retains current stage                | Postponed by 1 day without stage penalty         |

### 3. Priority Queue & Email Selection Engine

Problems are categorized into six priority tiers to balance active repetition against backlog recovery:

```mermaid
flowchart TD
    A["Active Due Problems (nextReviewAt <= now)"] --> B["Classify Problem Priority"]
    B --> C["Rank 1-4: Active Scheduled Revisions"]
    B --> D["Rank 5: Long-Overdue Backlog (>7d unreviewed)"]
    
    C --> E["Select up to 3 Active Problems"]
    D --> F["Select up to 2 Backlog Problems"]
    
    E --> G["Main Email Section: Due Today"]
    F --> H["Amber Section: From Your Backlog"]
    
    G & H --> I["Send Curated Daily Digest"]
```

- **Ranks 1 & 2 (Due Today):** Scheduled stage transitions and initial reviews scheduled for today.
- **Ranks 3 & 4 (Overdue Active):** Stage 1+ scheduled revisions or recently solved problems that missed their target date.
- **Rank 5 (Long-Overdue Backlog):** Stage 0 problems solved $>7$ days ago with zero review history.
- **Rank 6 (Upcoming):** Future review dates (deferred until due).

The daily email selects up to **3 active scheduled problems** plus up to **2 backlog problems**, providing a manageable daily target without ignoring older problems.

---

## Tech Stack

| Domain             | Technologies                                                                           |
| :----------------- | :------------------------------------------------------------------------------------- |
| **Frontend**       | React 19, TypeScript, Vite, Tailwind CSS, TanStack React Query, Recharts, Lucide Icons |
| **Backend**        | Node.js, Express.js, TypeScript, Zod, Cookie-Parser, CORS                              |
| **Database & ORM** | PostgreSQL (Neon Serverless Postgres / Supabase), Prisma ORM                           |
| **Email Delivery** | Brevo (Sendinblue) Transactional REST API                                              |
| **Task Scheduler** | cron-job.org HTTP Trigger / External Webhooks                                         |
| **Authentication** | JWT (JSON Web Tokens), HTTP-Only Secure Cookies, Bcrypt.js                             |
| **Deployment**     | Vercel (Frontend Client), Render (Backend API Service)                                 |

---

## Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js:** `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **npm:** `v9.0.0` or higher (packaged with Node.js)
- **Git:** ([Download Git](https://git-scm.com/))
- **PostgreSQL Database:** A local instance or hosted provider such as [Neon](https://neon.tech/) or [Supabase](https://supabase.com/)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/VinitKumarGupta/LeetRevise.git
   cd LeetRevise
   ```

2. **Install all dependencies across client, server, and root:**

   ```bash
   npm run install:all
   ```

---

## Configuration

1. **Create the server environment file:**

   Create a `.env` file in the `server` directory (refer to `server/.env.example`):

   ```env
   # PostgreSQL Connection (supports pooled and direct connection URLs)
   DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
   DIRECT_DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

   # Server Settings
   PORT=5000
   NODE_ENV="development"
   JWT_SECRET="your-secure-jwt-secret-key-min-32-chars"

   # Frontend Client URL (for CORS and email redirect links)
   APP_URL="http://localhost:5173"

   # Brevo (Sendinblue) Transactional Email (Optional for local testing)
   BREVO_API_KEY="xkeysib-your-brevo-api-key"
   EMAIL_FROM_ADDRESS="noreply.leetrevise@gmail.com"
   EMAIL_FROM_NAME="LeetRevise"

   # Secret token to protect the automated cron endpoint
   CRON_SECRET="your-secure-cron-trigger-token"
   ```

2. **Generate Prisma Client and push schema:**

   ```bash
   cd server
   npx prisma generate
   npx prisma db push
   cd ..
   ```

---

## Running the Application

### Development Mode

Run both the Vite frontend and Express backend concurrently:

```bash
npm run dev
```

- **Frontend Client:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

### Production Build

```bash
npm run build
npm start
```

### Running Tests

Execute the Jest test suite in the backend:

```bash
cd server
npm test
```

---

## API Endpoints & Cron

### Core Endpoints

| Method | Endpoint                        | Auth | Description                                                       |
| :----- | :------------------------------ | :--- | :---------------------------------------------------------------- |
| `GET`  | `/api/health`                   | No   | Server health status, database connectivity, and latency metrics  |
| `GET`  | `/api/ping`                     | No   | Lightweight keep-alive ping for server cold-start prevention      |
| `POST` | `/api/auth/register`            | No   | User account registration                                         |
| `POST` | `/api/auth/login`               | No   | User authentication and HTTP-only cookie issuance                 |
| `POST` | `/api/sync`                     | Yes  | Sync up to 6 latest accepted submissions from connected LeetCode |
| `POST` | `/api/sync/manual`              | Yes  | Manually add a problem by URL or title slug                       |
| `GET`  | `/api/problems`                 | Yes  | List user problems with search, difficulty, and stage filters     |
| `POST` | `/api/problems/:id/review`      | Yes  | Submit review grade (`easy`, `effort`, `forgot`, `skipped`)       |
| `GET`  | `/api/analytics`                | Yes  | Fetch dashboard consistency stats, streaks, and difficulty ratios |
| `GET`  | `/api/leaderboard`              | Opt  | Community streak and solve count rankings                         |

### Automated Email Reminders via Cron

The application exposes a dedicated endpoint to trigger daily reminder emails:

- **Endpoint:** `ALL /api/notifications/send-due-reminders`
- **Authentication:** Protected by `CRON_SECRET`. Supports:
  - Header: `Authorization: Bearer <CRON_SECRET>`
  - Header: `x-cron-secret: <CRON_SECRET>`
  - Query Parameter: `?secret=<CRON_SECRET>`
- **Immediate Test Trigger:** `POST /api/notifications/test-email` (Authenticated user sends test digest to their registered email)
- **Daily Cron Integration:** Configure a free daily cron on [cron-job.org](https://cron-job.org/) pointing to:
  ```http
  GET https://your-server.onrender.com/api/notifications/send-due-reminders?secret=your-secure-cron-trigger-token
  ```

---

## Contributing

Contributions, issues, and feature suggestions are welcome!

1. Fork the Repository (`https://github.com/VinitKumarGupta/LeetRevise/fork`)
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for full details.
