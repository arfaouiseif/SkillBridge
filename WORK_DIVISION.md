# SkillBridge – Work Division

> Team of two. Put this file at the root of the repo and update it when roles or tasks change.

| | Person A | Person B |
|---|---|---|
| **Name** | `[fill in]` | `[fill in]` |
| **Main role (phases 0-3)** | Frontend lead (Angular) | Backend lead (API + DB) |
| **Role after the swap (phases 4-6)** | Backend lead | Frontend lead |
| **GitHub** | `[fill in]` | `[fill in]` |

Each lead **owns** their area: they make the final call on its structure and reviews every PR touching it. Both of us must be able to explain the whole project at the defense, so we swap roles halfway.

---

## 1. Repository structure

```
skillbridge/
├── frontend/        # Angular app
├── backend/         # Node.js API (Express/NestJS) + Prisma
├── docs/            # API contract (openapi.yaml), diagrams, deliverables
├── docker-compose.yml
├── WORK_DIVISION.md
└── README.md
```

- `frontend/` is owned by the frontend lead, `backend/` by the backend lead.
- `docs/openapi.yaml` is **shared**: any change goes through a PR approved by both.

## 2. The API contract comes first

Before a phase starts, both of us write or update `docs/openapi.yaml` for its endpoints (routes, request bodies, responses, error codes). Then:

- Backend implements it.
- Frontend builds against it using mock data (a mock service or JSON server) until the real endpoint is ready.

This lets us work in parallel without blocking each other.

## 3. Task split per phase

| Phase | Shared (together) | Frontend | Backend |
|---|---|---|---|
| **0. Setup** | Repo, board, Git rules, Docker Compose, OpenAPI skeleton | Angular app, routing, Angular Material, folder conventions | API skeleton (`/health`), Prisma, DB schema, seed script |
| **1. Auth + profiles** | Auth endpoints in OpenAPI | Register/login forms, auth service, JWT interceptor, route guards, profile page (teach/learn skills) | `/auth/*`, password hashing, JWT, `/users/me`, `/skills`, user skills CRUD |
| **2. Search + matching** | Match score formula | Search page, filters, user cards, "Suggested matches" | Search endpoint with filters, SQL matching query, pagination |
| **3. Booking** | Session status flow (pending, accepted, declined, completed, cancelled) | Availability editor, FullCalendar, "My sessions" page | Availabilities and sessions endpoints, conflict check, status transitions, e-mail notifications |
| **4. Chat** | Socket event names and payloads | Chat UI, typing indicator, unread badge | Socket.IO server, message storage, read receipts |
| **5. Reviews + recommendations** | Recommendation score weights | Review form, stars, rating on profile, "Top-rated" and "Recommended for you" sections | Reviews endpoints (only after a completed session), average rating, weighted recommendation query |
| **6. Polish** | Demo scenario, deployment, final report | Dark mode, skeletons, toasts, empty states, responsive pass | Admin endpoints, report/block, performance and validation pass |

**Role swap:** from phase 4 on, A takes the backend side and B the frontend side (phases 4-6 are the ones where swapping is cheapest because the contract is already stable). If the schedule is tight, we swap only for phase 5.

## 4. Git workflow

- `main`: always working, never pushed to directly.
- `develop`: integration branch (optional; skip it if we prefer PRs straight to `main`).
- Feature branches: `feat/<area>-<short-name>`, e.g. `feat/front-login-form`, `feat/back-matching-query`. Fixes: `fix/...`.
- Commit messages: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:` + short description.
- **Every change goes through a Pull Request**, reviewed by the other person before merge (even a quick look).
- Keep PRs small (one feature or one screen). Merge at least every 1-2 days to avoid conflicts.
- Never commit secrets: `.env` is in `.gitignore`; share an `.env.example` instead.

## 5. Task tracking

- GitHub Projects board with columns: **Backlog, In progress, In review, Done**.
- One issue per task, labelled `frontend`, `backend` or `shared`, with an assignee and the phase (`phase-1`, ...).
- A task is moved to *In progress* only by the person who starts it.

## 6. Definition of done

A task is done when:

1. It works locally from a fresh `docker compose up` + `ng serve`.
2. The endpoint or screen matches `openapi.yaml`.
3. Errors and empty states are handled (invalid input, no results, network failure).
4. The PR is reviewed and merged, and the issue is closed.
5. If it adds setup steps (env variable, migration, seed), the README is updated.

## 7. Communication

- Quick sync (10 min) at the start of each working session: what I did, what I'm doing, what blocks me.
- One longer meeting per week: review the board, demo what was merged, plan the next phase.
- Blocked for more than 30 minutes on something the other person owns? Ask immediately.
- Decisions that affect both sides (data model, API changes, libraries) are written in `docs/decisions.md` with a date and a one-line reason.

## 8. Rules of ownership

- Don't edit the other person's area without telling them. If it's small, open a PR and tag them.
- Database schema changes (Prisma migrations) go through the backend lead and are announced before merging.
- UI conventions (colors, spacing, shared components) are set by the frontend lead; both of us reuse them.

## 9. Schedule

| Phase | Planned dates | Status |
|---|---|---|
| 0. Setup | `[fill in]` | ☐ |
| 1. Auth + profiles | `[fill in]` | ☐ |
| 2. Search + matching | `[fill in]` | ☐ |
| 3. Booking | `[fill in]` | ☐ |
| 4. Chat | `[fill in]` | ☐ |
| 5. Reviews + recommendations | `[fill in]` | ☐ |
| 6. Polish + demo | `[fill in]` | ☐ |

Principle: a polished smaller scope beats a half-finished big one. If we fall behind, we cut from the end of the list (extras first, then phase 5 recommendations), never the core.
