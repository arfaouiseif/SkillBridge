# SkillBridge

A web platform where people exchange skills without using money: technical (Python, Photoshop), practical (DIY, cooking), languages, academic and more. Someone who can teach X and wants to learn Y is matched with someone who can teach Y and wants to learn X.

Course project: Projet Web, SUP'COM 2025/2026.

## Main features

- Sign up / sign in, profile with skills to teach and skills to learn
- Search with filters and a matching score
- Booking with a calendar (availabilities, session statuses)
- Real-time chat
- Reviews and recommendations

## Tech stack

| Part | Technology |
|---|---|
| Frontend | Angular, Angular Material |
| Backend | Node.js (Express or NestJS) |
| Database | PostgreSQL with Prisma |
| Realtime | Socket.IO |
| Dev environment | Docker Compose |

## Repository structure

```
skillbridge/
├── frontend/        # Angular app            (added in phase 0)
├── backend/         # Node.js API + Prisma   (added in phase 0)
├── docs/            # API contract and decisions
│   └── openapi.yaml
├── WORK_DIVISION.md # who does what, Git rules
└── README.md
```

## Getting started

Setup instructions will be added at the end of phase 0, once the frontend and backend skeletons exist.

Prerequisites to install in the meantime:

- [Node.js](https://nodejs.org) (LTS version) and npm
- [Git](https://git-scm.com)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- An editor, e.g. [VS Code](https://code.visualstudio.com)

## Team and workflow

See [WORK_DIVISION.md](WORK_DIVISION.md) for roles, Git workflow and definition of done.
The API contract lives in [docs/openapi.yaml](docs/openapi.yaml).
