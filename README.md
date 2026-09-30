# Blog CMS API

A full-stack blog/CMS platform — a REST API plus a working browser frontend — where users can register, log in, publish posts, and comment on each other's posts. Built with **Node.js + Express** and a **vanilla HTML/CSS/JS frontend**, deployed as an always-on web service on **Render**, backed by **PostgreSQL (Neon, or Render's own managed Postgres)** via **Prisma ORM**, secured with **JWT authentication**.

🔗 **Live API:** `<https://blogcms-api-port-folio.onrender.com>`
📬 **Public Postman Workspace (click "Send" on any request to see live results):** `<https://documenter.getpostman.com/view/58450852/2sBYB4KSHE>`
🖥️ **GitHub Repo:** `<https://github.com/FxAdmiral/port-folio.git>`

> **Note on cold starts:** if you deployed on Render's free tier, the service sleeps after ~15 minutes of inactivity and the first request can take 30-50 seconds to wake it up. If you're sending this link to recruiters, either upgrade off the free tier or send a "wake-up" request a minute before sharing the Postman link.

> ### 👋 If you're a recruiter or reviewer
> You can test every API endpoint live, right now, with zero setup: open the **Public Postman Workspace** link above, and click **Send** on any request — starting with `Auth → Register`. No account, no code, no cloning this repo required. Full step-by-step order is in [Testing the API via Postman](#testing-the-api-via-postman) below.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Running Locally](#running-locally)
- [Deployment (Render + Neon)](#deployment-render--neon)
- [Testing the API via Postman](#testing-the-api-via-postman)
- [Error Handling](#error-handling)
- [Project Structure](#project-structure)
- [Future Improvements](#future-improvements)

---

## Overview

This project simulates a real-world blogging platform's backend. It demonstrates:

- Designing a relational data model (Users → Posts → Comments) with proper foreign-key relationships
- Implementing secure authentication (password hashing + JWT) from scratch, without relying on a pre-built auth service
- Enforcing authorization rules (e.g. only a post's author can edit/delete it)
- Structuring a clean, layered Express app (routes → controllers → shared database client) that runs as a simple always-on service
- Shipping the project with a **public, interactive API collection** so anyone — no local setup, no account, no code — can try every endpoint against the live deployment

## Tech Stack

| Layer          | Choice                                   |
|----------------|-------------------------------------------|
| Runtime        | Node.js 18+                              |
| Framework      | Express 4                                |
| Database       | PostgreSQL (hosted on [Neon](https://neon.tech) or Render's managed Postgres) |
| ORM            | Prisma                                   |
| Auth           | JSON Web Tokens (jsonwebtoken) + bcrypt password hashing |
| Deployment     | Render (Web Service — always-on Node process) |
| API Testing    | Postman (public workspace)               |

## Architecture

```
Client (Postman / Browser / Frontend)
        │
        ▼
Render Web Service — always-on Node process (api/index.js — Express app)
        │
        ├── /api/auth/*      → Auth routes  → authController
        ├── /api/posts/*     → Post routes  → postController
        └── /api/posts/:id/comments/* → Comment routes → commentController
        │
        ▼
Prisma Client (singleton)
        │
        ▼
PostgreSQL Database (Neon or Render managed Postgres)
```

Because this runs as a single long-lived process rather than a serverless function, the app keeps one database connection pool alive for its whole lifetime instead of opening/closing one per request — simpler and more efficient than the connection-churn problem serverless platforms have to work around.

## Data Models

**User**
| Field    | Type      |
|----------|-----------|
| id       | Int (PK)  |
| name     | String    |
| email    | String (unique) |
| password | String (hashed) |
| createdAt| DateTime  |

**Post**
| Field     | Type     |
|-----------|----------|
| id        | Int (PK) |
| title     | String   |
| content   | String   |
| published | Boolean  |
| authorId  | Int (FK → User) |
| createdAt / updatedAt | DateTime |

**Comment**
| Field    | Type     |
|----------|----------|
| id       | Int (PK) |
| text     | String   |
| postId   | Int (FK → Post) |
| authorId | Int (FK → User) |
| createdAt| DateTime |

Full schema: [`prisma/schema.prisma`](./prisma/schema.prisma)

## API Endpoints

### Auth
| Method | Endpoint            | Auth required | Description                  |
|--------|---------------------|:---:|-------------------------------|
| POST   | `/api/auth/register` | No  | Create a new user account, returns JWT |
| POST   | `/api/auth/login`    | No  | Log in, returns JWT           |
| GET    | `/api/auth/me`       | Yes | Get the logged-in user's profile |

### Posts
| Method | Endpoint         | Auth required | Description                        |
|--------|------------------|:---:|-------------------------------------|
| GET    | `/api/posts?page=1&limit=10` | No  | List published posts, paginated (default `limit` 10, max 50) |
| GET    | `/api/posts?search=keyword`  | No  | Search published posts by keyword (matches title or content, case-insensitive); combine with `page`/`limit` |
| GET    | `/api/posts/:id` | No  | Get one post with its author and its first 20 comments |
| POST   | `/api/posts`     | Yes | Create a post                        |
| PUT    | `/api/posts/:id` | Yes | Update a post (owner only)           |
| DELETE | `/api/posts/:id` | Yes | Delete a post (owner only)           |

### Comments
| Method | Endpoint                                | Auth required | Description                  |
|--------|------------------------------------------|:---:|-------------------------------|
| GET    | `/api/posts/:postId/comments?page=1&limit=20` | No  | List comments on a post, paginated |
| POST   | `/api/posts/:postId/comments`            | Yes | Add a comment to a post       |
| DELETE | `/api/posts/:postId/comments/:commentId` | Yes | Delete a comment (owner only) |

### Pagination

`GET /api/posts` and `GET /api/posts/:postId/comments` both accept `?page=` and `?limit=` query params (both optional; `limit` defaults to 10 and is capped at 50 regardless of what's requested, so a client can't pull the entire table in one call). Every paginated response includes a `pagination` object alongside the data:

```json
{
  "posts": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 25,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

`GET /api/posts/:id` (single post) still returns up to 20 comments inline for convenience; if a post has more than that, fetch the rest from the dedicated comments endpoint above.

### Keyword Search

`GET /api/posts` also accepts `?search=`, matching against both `title` and `content` (case-insensitive, partial match — e.g. `?search=react` matches "Learning React Hooks"). It composes with pagination, so `?search=react&page=2&limit=10` works as expected. When a search is active, the response includes the search term back: `{ "posts": [...], "pagination": {...}, "search": "react" }`. An empty or missing `search` param returns the full unfiltered list.

## Authentication

This API uses **stateless JWT auth**:

1. `POST /api/auth/register` or `/api/auth/login` returns a signed JWT.
2. For any protected endpoint, send the token in the header:
   ```
   Authorization: Bearer <your_token_here>
   ```
3. Tokens expire after 7 days.

Passwords are never stored in plain text — they're hashed with `bcrypt` (10 salt rounds) before being saved.

## Running Locally

```bash
git clone <your-repo-url>
cd blog-api
npm install
cp .env.example .env      # then fill in DATABASE_URL, DIRECT_URL, JWT_SECRET
npx prisma migrate dev --name init
npm run dev                # runs on http://localhost:5000
```

### Seeding test data (recommended before you deploy)

To actually see pagination behave — rather than testing against 2 or 3 posts — seed the database with enough fake data to span multiple pages:

```bash
npm run seed
```

This creates 25 posts (10 per page at the default `limit`, so 3 pages) with 3 comments each, under a test account:
```
email: seed@example.com
password: password123
```

Then test the full flow locally before you touch Render at all:
1. `GET /api/posts` → confirm you get 10 posts back and `pagination.totalPages` is 3
2. `GET /api/posts?page=2` → confirm you get the next 10, and `hasPrevPage` is `true`
3. `GET /api/posts?page=99` → confirm it returns an empty `posts` array, not an error
4. `POST /api/auth/login` with the seed account → confirms auth still works end-to-end after seeding
5. `GET /api/posts?search=Seeded` → confirm all 25 seeded posts match (they all contain "Seeded" in the title); `GET /api/posts?search=nonexistentword` → confirm it returns an empty `posts` array, not an error
6. Open `http://localhost:5000` in a browser and click through Previous/Next on the homepage, then try the search box, to confirm the frontend matches what the API returns

## Deployment (Render + Neon)

1. **Create a Neon project** at [neon.tech](https://neon.tech) → copy the pooled connection string (`DATABASE_URL`) and the direct connection string (`DIRECT_URL`). (Alternatively, skip Neon and create a free Postgres instance directly inside Render.)
2. **Push this repo to GitHub.**
3. **Create a new Web Service on Render** ([dashboard.render.com/new/web](https://dashboard.render.com/new/web)) and connect your GitHub repo. Render will auto-detect the `render.yaml` in this repo, or you can set manually:
   - **Build command:** `npm install && npx prisma generate`
   - **Start command:** `node api/index.js`
4. In Render's **Environment** tab, add:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `JWT_SECRET`
5. Deploy. Render will build and start the service, keeping it running continuously (no per-request cold start once it's awake).
6. Run the migration against your production database once (from your local machine, pointed at the same `DATABASE_URL`/`DIRECT_URL`):
   ```bash
   npx prisma migrate deploy
   ```

> Free-tier Render services spin down after ~15 minutes idle. If your demo needs to always feel instant, either upgrade the plan or ping the health-check endpoint (`GET /api/health`) shortly before sharing the link.

## Frontend

A small vanilla HTML/CSS/JS frontend lives in `/public` and is served by the same Express app at `/` — no separate deployment or build step needed. It's a hash-routed single-page app:

- **Home (`#/`, `#/?page=2`, `#/?search=react`)** — lists published posts (title, author, date, comment count), paginated with Previous/Next controls, with a keyword search box
- **Post detail (`#/post/:id`)** — full post, comments, add-comment form (if logged in), delete post/comment (owner only)
- **Register / Login (`#/register`, `#/login`)** — stores the returned JWT in `localStorage`
- **Write (`#/new`)** — protected, only visible once logged in

It talks to the same `/api/*` endpoints documented above via `fetch`, so it's a live demonstration that the API works — not just something Postman can hit.

## Testing the API via Postman

You don't need to clone this repo, install anything, or write a single line of code to try this API — you can test every endpoint against the **live, running deployment** directly in your browser in about a minute.

👉 **Open the public workspace here:** `<ADD YOUR POSTMAN PUBLIC WORKSPACE LINK HERE>`

**What you'll see:** the link opens a Postman workspace with a collection called "Blog CMS API," organized into three folders — Auth, Posts, Comments. Each request is already filled in with a real, working example — you just click **Send**.

**No Postman account needed** to view and run requests in a public workspace — just click the link and go. (If you want to save your own copy to tinker with, you can optionally sign up for a free Postman account, but it's not required just to test things.)

### Recommended order to click through

Since some requests depend on data created by earlier ones (like needing to be logged in before creating a post), try them in this order for the smoothest experience:

1. **Auth → Register** — click Send. Creates a throwaway test account and automatically saves the login token for you — you won't need to copy/paste anything.
2. **Posts → Get All Posts** — click Send. See the real, seeded posts already in the live database, with pagination info in the response.
3. **Posts → Search Posts** — click Send. See keyword search working (try changing the `search` query param to any word, like `Seeded`).
4. **Posts → Create Post** — click Send. Creates a brand new post under your test account — the response will include its real new `id`.
5. **Posts → Get Post By Id** — click Send. Fetches the post you just created.
6. **Comments → Add Comment** — click Send. Adds a comment to that post.
7. **Comments → Get Comments For Post** — click Send. See your comment in the response.
8. **Posts → Update Post** / **Posts → Delete Post** — click Send. Edit or remove the post you created (you'll get a `403 Forbidden` if you ever try this on a post you don't own — that's the ownership check working as intended, not a bug).

**A note on timing:** if this is the first request in a little while, the server may take 20-40 seconds to respond on the very first click (it's hosted on a free tier that sleeps when idle) — that's expected, not an error. Every request after that first one will be instant.

That's the whole test — no setup, no account, no waiting on anyone. If something doesn't behave as described above, that's useful feedback; feel free to flag it.

## Error Handling

All errors return JSON in the shape:
```json
{ "error": "Human-readable message" }
```
Common status codes: `400` (validation), `401` (missing/invalid token), `403` (not the resource owner), `404` (not found), `409` (duplicate, e.g. email already registered), `500` (unexpected server error).

## Project Structure

```
blog-api/
├── api/
│   └── index.js              # Express app entrypoint (also the Render start target)
├── public/                    # Frontend (served as static files by Express)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── src/
│   ├── controllers/          # Business logic
│   ├── routes/                # Route definitions
│   ├── middleware/            # auth.js (JWT check), errorHandler.js
│   └── lib/prisma.js          # Prisma client singleton
├── prisma/
│   └── schema.prisma          # Database schema
├── render.yaml                # Render deployment config (optional, for Blueprint deploys)
├── .env.example
└── README.md
```

## Future Improvements

- Pagination on `GET /api/posts`
- Rate limiting on auth routes
- Refresh tokens (current JWTs are long-lived access tokens only)
- Post tags/categories
- Automated tests (Jest + Supertest)