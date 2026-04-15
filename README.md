# Yorindo EMS — Backend API

A REST API backend for the **Yorindo Event Management System (EMS)**, built with Node.js, Express, TypeScript, and MongoDB. It handles event lifecycle management, participant registration, check-in, email delivery, survey analytics, and AI-powered insights.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Key Features](#key-features)
- [Database](#database)
- [Email & Queue](#email--queue)
- [Seeding](#seeding)
- [Health Checks](#health-checks)

---

## Overview

Yorindo EMS is an internal dashboard for PT. XYZ staff to manage B2B technology seminars and events across Indonesia. The system covers the full event lifecycle: creating events, building registration forms, approving or rejecting participants, issuing QR tickets, checking in attendees, sending email broadcasts, and analyzing survey responses.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM, TypeScript) |
| Framework | Express 5 |
| Database | MongoDB via Mongoose |
| Validation | Zod |
| Authentication | OTP via email + JWT |
| Email | Nodemailer + Brevo SMTP |
| Queue | RabbitMQ (amqplib) |
| QR Codes | `qrcode` library |
| AI/LLM | Configurable via `LLM_BASE_URL` (OpenAI-compatible) |

---

## Project Structure

```
src/
├── app.ts                  # Express app setup, middleware, health routes
├── server.ts               # Entry point — DB connect, queue consumer, listen
├── config/
│   ├── brevo.ts            # SMTP transporter setup
│   ├── db.ts               # MongoDB connection
│   └── env.ts              # Typed environment variables
├── controllers/            # HTTP handlers (delegate to services)
├── middlewares/
│   ├── auth.middleware.ts  # requireAuth, requireRole, requirePermission
│   ├── error.middleware.ts # Global error handler and 404 handler
│   ├── rateLimiter.middleware.ts
│   └── validate.middleware.ts # Zod-based request validation factory
├── models/
│   ├── constants/          # Enums and default role permissions
│   ├── helpers/            # Mongoose field transformers (trim, lowercase)
│   └── schemas/            # Mongoose schemas (Event, Registration, User, etc.)
├── routes/                 # Express routers, one file per feature
├── scripts/
│   ├── seed.ts             # Full database reset and seed
│   └── seed_group2.ts      # Append-only participant seeder
├── services/               # Business logic layer (no Express types)
├── types/                  # Shared TypeScript types
├── utils/
│   ├── apiResponse.ts      # sendSuccess / sendError helpers
│   ├── jwt.ts              # Sign/verify access tokens and ticket tokens
│   ├── llmClient.ts        # LLM chat completion client with retry
│   └── slugify.ts          # URL slug generator
└── validators/             # Zod schemas per feature
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- RabbitMQ (optional — email delivery falls back gracefully)
- A Brevo SMTP account (or any SMTP provider)

### Installation

```bash
git clone <repo-url>
cd <repo>
npm install
```

### Running in Development

```bash
cp .env.example .env
# fill in the required values (see Environment Variables below)
npm run dev
```

### Running in Production

```bash
npm run build
npm start
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Server port |
| `MONGODB_URI` | **Yes** | — | MongoDB connection string |
| `JWT_SECRET` | **Yes** | dev fallback | Secret for signing JWTs |
| `JWT_EXPIRES_IN_HOURS` | No | `8` | JWT lifetime in hours |
| `CORS_ORIGIN` | No | (none) | Comma-separated allowed origins |
| `SMTP_HOST` | **Yes** | — | SMTP server host |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | **Yes** | — | SMTP username |
| `SMTP_PASS` | **Yes** | — | SMTP password |
| `SMTP_SECURE` | No | `false` | Use TLS from the start |
| `SMTP_STARTTLS` | No | `false` | Require STARTTLS |
| `MAIL_FROM_NAME` | No | `Yorindo EMS` | Sender display name |
| `MAIL_FROM_EMAIL` | No | SMTP_USER | Sender address |
| `RABBITMQ_URL` | No | `amqp://guest:guest@localhost:5672` | RabbitMQ connection URL |
| `EMAIL_QUEUE_NAME` | No | `email.send` | Queue name for email jobs |
| `EMAIL_QUEUE_PREFETCH` | No | `1` | RabbitMQ prefetch count |
| `OTP_EXPIRES_IN_MINUTES` | No | `5` | OTP validity window |
| `OTP_MAX_ATTEMPTS` | No | `5` | Failed attempts before OTP is invalidated |
| `OTP_RESEND_COOLDOWN_SECONDS` | No | `60` | Minimum seconds between OTP requests |
| `LLM_BASE_URL` | No | — | Base URL for LLM API (OpenAI-compatible) |
| `LLM_API_KEY` | No | — | LLM API key |
| `LLM_MODEL` | No | — | Model name (e.g. `gpt-4o-mini`) |
| `LLM_TIMEOUT_MS` | No | `20000` | LLM request timeout in ms |
| `LLM_RETRY_ATTEMPTS` | No | `1` | Number of retries on failure |
| `LLM_RETRY_DELAY_MS` | No | `800` | Delay between retries in ms |
| `SKIP_SMTP_VERIFY` | No | `false` | Skip TLS certificate verification |

---

## API Endpoints

All routes are prefixed with `/api/v1`.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/request-otp` | Request a 6-digit OTP via email |
| POST | `/auth/verify-otp` | Verify OTP and receive a JWT |
| GET | `/auth/me` | Get the authenticated user's profile |

### Events
| Method | Path | Description |
|---|---|---|
| GET | `/events` | List events (paginated, filterable) |
| GET | `/events/stats` | Dashboard stat cards |
| GET | `/events/:id` | Get event by ID |
| POST | `/events` | Create event (status forced to `draft`) |
| PATCH | `/events/:id` | Partially update event |
| DELETE | `/events/:id` | Soft-delete event (sets status to `cancelled`) |
| DELETE | `/events/:id/hard` | Permanently delete event and its registrations |

### Registrations
| Method | Path | Description |
|---|---|---|
| GET | `/events/:eventId/registrations` | List registrations (paginated, filterable) |
| GET | `/events/:eventId/registrations/filters` | Available filter options |
| PATCH | `/events/:eventId/registrations/:id/approve` | Approve a pending registration |
| PATCH | `/events/:eventId/registrations/:id/reject` | Reject a pending registration |
| PATCH | `/events/:eventId/registrations/bulk-approve` | Bulk approve |
| PATCH | `/events/:eventId/registrations/bulk-reject` | Bulk reject |
| PATCH | `/events/:eventId/registrations/reject-all` | Reject all pending |

### Check-In
| Method | Path | Description |
|---|---|---|
| GET | `/events/:eventId/check-ins/stats` | Check-in statistics |
| GET | `/events/:eventId/check-ins/recent` | Recent check-ins |
| GET | `/events/:eventId/check-ins/lookup` | Search approved participants |
| POST | `/events/:eventId/check-ins/scan` | QR code scan check-in |
| POST | `/events/:eventId/check-ins/manual` | Manual check-in by registration ID |

### Form Builder
| Method | Path | Description |
|---|---|---|
| GET | `/form-builder/events/:eventId` | Get form for an event |
| GET | `/form-builder/industries/:industryId` | Get form by industry |
| GET | `/form-builder/slug/:slug` | Get form by event slug (public) |
| PUT | `/form-builder/events/:eventId` | Create or update form |

### Visitor Registration (Public)
| Method | Path | Description |
|---|---|---|
| POST | `/visitor/register` | Submit a visitor registration |

### Analytics
| Method | Path | Description |
|---|---|---|
| GET | `/analytics/events/:eventId/participants/summary` | Participant summary |
| GET | `/analytics/events/:eventId/overview` | Monthly registration overview |
| GET | `/analytics/events/:eventId/insights` | AI-generated event insights |
| GET | `/analytics/events/:eventId/survey` | Survey analytics |
| GET | `/analytics/events/:eventId/survey/overview` | Survey analytics + AI insights |
| GET | `/analytics/events/:eventId/survey/insights` | AI survey insight |
| GET | `/analytics/events/:eventId/feedback` | Feedback analytics |

### Communication
| Method | Path | Description |
|---|---|---|
| GET | `/communications/audience` | Load recipient list with filters |
| GET | `/communications/drafts` | List drafts for current user |
| GET | `/communications/drafts/:draftId` | Get draft detail |
| GET | `/communications/campaigns` | Campaign send history |
| POST | `/communications/campaigns` | Save draft or queue broadcast |
| POST | `/communications/preview` | Preview rendered email HTML |
| POST | `/communications/generate` | AI-generate email subject/body |

### Users (super_admin only)
| Method | Path | Description |
|---|---|---|
| GET | `/users` | List staff users |
| POST | `/users` | Create staff user |
| PATCH | `/users/:id` | Update user role or name |
| DELETE | `/users/:id` | Delete user |
| PATCH | `/users/:id/toggle-active` | Activate or deactivate user |

### Industries
| Method | Path | Description |
|---|---|---|
| GET | `/industries` | List all industries |
| POST | `/industries` | Create an industry |

### Feedback
| Method | Path | Description |
|---|---|---|
| POST | `/feedback` | Submit post-event feedback |

---

## Authentication

The system uses **OTP-based login** — there are no stored passwords.

1. Staff submits their email → server sends a 6-digit OTP
2. Staff submits the OTP → server returns a **JWT access token**
3. All protected routes require the header: `Authorization: Bearer <token>`

**Roles** (stored in JWT):

| Role | Access |
|---|---|
| `super_admin` | Full access including user management |
| `admin` | Full feature access, no user management |
| `event_operator` | Events, registrations, check-in |
| `communication_operator` | Email campaigns |
| `survey_analyst` | Surveys and analytics |

**Permissions** are baked into the JWT at login time. Changes take effect on the user's next login.

---

## Key Features

### QR Ticket Delivery
When a registration is approved, a unique QR code is generated and a ticket email is queued in RabbitMQ. The background consumer renders an HTML email with the QR image attached and delivers it via SMTP.

### Email Broadcasting
Staff can compose HTML email campaigns, preview them with per-recipient variable substitution (`{{recipientName}}`, `{{recipientEmail}}`), and send to filtered audiences (by event, status, industry, city, company, etc.). Campaigns are queued and processed asynchronously.

### AI Insights
If an LLM is configured, the system generates:
- **Event analytics insights**: summary, highlights, and recommendations based on registration data
- **Survey insights**: key findings and exhibitor action items from survey responses
- **Email content generation**: subject, preview text, and body HTML for communication campaigns

AI results are cached per event/month to avoid repeated LLM calls.

### Check-In
Two check-in methods are supported:
- **QR scan**: validates a JWT-signed QR payload against the registration record
- **Manual**: staff selects a participant from a search lookup

---

## Database

MongoDB collections:

| Collection | Description |
|---|---|
| `users` | Internal staff accounts |
| `otps` | One-time passwords (TTL-indexed, auto-deleted on expiry) |
| `events` | Event documents with embedded registration form |
| `participants` | Persistent participant profiles |
| `registrations` | Event registrations with snapshots and answers |
| `survey_responses` | Post-event survey answers |
| `communication_campaigns` | Email broadcast campaigns |
| `audit_logs` | Append-only action audit trail |
| `industries` / `cities` / `job_titles` / `companies` | Master data |
| `event_analytic_insight_cache` | Cached AI event insights |
| `event_ai_insight_cache` | Cached AI survey insights |

---

## Email & Queue

Email delivery uses **two transports**:

1. **SMTP (Brevo or compatible)** — direct send for OTP emails and as the final delivery step
2. **RabbitMQ** — queues ticket emails and campaign emails; a background consumer processes the queue

If RabbitMQ is unavailable at startup, the server continues running and logs a warning. Queue health can be checked at `/queue-health`.

---

## Seeding

Two seed scripts are provided:

```bash
# Full reset — clears all collections and inserts fresh data
npx tsx src/scripts/seed.ts

# Append-only — adds 100 participants to an existing event
npx tsx src/scripts/seed_group2.ts
```

> **Warning:** `seed.ts` deletes all existing data. Do not run against a production database.

Set `SEED_TARGET_EVENT_ID` in your environment to target a specific event with the append seeder.

---

## Health Checks

| Endpoint | Checks |
|---|---|
| `GET /health` | Server is up |
| `GET /db-health` | MongoDB connection state |
| `GET /brevo-health` | SMTP connectivity and config |
| `GET /queue-health` | RabbitMQ connection and consumer state |
