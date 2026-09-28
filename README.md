# Mini Jira: Task Tracker

Projects, teams and tasks with comments, change history, secure JWT authentication and email notifications.

**Stack:** React 18 (Vite) · Redux Toolkit · Node.js + Express · MongoDB (Mongoose)

## Requirements

- Node.js 18.18 or newer
- MongoDB 6+ running locally (`mongodb://localhost:27017`), or a free MongoDB Atlas cluster

## Run it

```bash
# 1. API
cd server
cp .env.example .env        # set ACCESS_TOKEN_SECRET (and MONGO_URI if you use Atlas)
npm install
npm run seed                # mock data (see below)
npm run dev                 # http://localhost:5000/api

# 2. Web app (second terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

**Upgrading a database from an earlier version?** Run `npm run migrate` once. It turns managers and members into users, team managers into team members, and project owners into project members. It's safe to run twice.

### Mock data

| Command | What it does |
|---|---|
| `npm run seed` | Loads mock data into an **empty** database (refuses if data exists) |
| `npm run seed:reset` | **Deletes everything**, then loads mock data |
| `npm run create-admin` | Creates one admin from `ADMIN_*` in `.env` (for a clean start) |

The mock data has 12 users (1 deactivated), 4 teams, 6 projects (WEB, MOB, PAY, ADM, SRCH, MKT), 28 tasks, 12 comments and matching history. Every password is `Password123`.

| Sign in as | Role | Notes |
|---|---|---|
| `admin@minijira.dev` | Admin | Users page; creates teams and projects; sees everything |
| `priya@minijira.dev` | User | In Web + Mobile teams, added directly to SRCH |
| `sara@minijira.dev` | User | QA team, added directly to PAY |
| `vikram@minijira.dev` | User | **Deleted** (inactive in the DB): sign-in is refused and he doesn't appear anywhere in the app |

## Roles

| | Admin | User |
|---|---|---|
| Add, edit and delete users | ✓ | |
| Create / edit teams and their members | ✓ | |
| Create / edit projects, add teams and people to them | ✓ | |
| See projects and tasks | all | projects they're part of |
| Create tasks, edit them, comment, change status | ✓ | ✓ |
| Assign an **unassigned** task | ✓ | ✓ |
| Reassign an assigned task | ✓ | only a task assigned to them |

A user is part of a project if they were added directly or belong to one of its teams. Users can be in many teams, and teams can work on many projects.

## Nothing is deleted permanently

- **Users:** "Delete" sets `isActive = false` and records `deactivatedAt` in MongoDB. The record stays in the database only:
  - The app never shows inactive users: they're gone from the Users page, team and project member lists, and assignee pickers. The API returns 404 for them.
  - They're signed out, can't sign in, and their open tasks become unassigned.
  - Past tasks, comments and history still show their name.
  - Their email can't be reused for a new account.
  - Reactivation is a database operation: `db.users.updateOne({ email: "…" }, { $set: { isActive: true, deactivatedAt: null } })`
- **Tasks:** set the status to **Closed**. Closed tasks are read-only (comments still allowed) until reopened, and lists hide them unless you tick "Show closed".
- **Comments:** authors can edit their own. Comments are never deleted.
- **Projects:** can only be deleted while they have no tasks.

## Task screen

The task list is read-only. Click a task's **key** or title to open it:

- **Header:** the task key (click to copy key and title), status, priority, overdue flag, title (editable), who created it and when.
- **Description:** view it, or click Edit to change it.
- **Comments:** a discussion thread. Ctrl + Enter posts, authors can edit, and "(edited)" is shown.
- **History:** every change (status, assignee, priority, due date, title, description, comments) with who and when.
- **Details sidebar:** status, priority, assignee (type to search) and due date. Each saves as soon as you change it. Also shows project, reporter and created date, plus a **Close task** button.

## Security

| Threat | Protection |
|---|---|
| Stolen token via XSS | The access token (15 min) is kept in memory only. The refresh token is an `httpOnly` cookie. |
| Stolen refresh token | It rotates on every use. Replaying an old one revokes the whole session. Only hashes are stored. |
| CSRF | `SameSite=Strict` cookie scoped to `/api/auth`, a required `X-Requested-With` header, and CORS limited to `CLIENT_URL`. |
| Password guessing | bcrypt, 15-minute lock after 5 failures, IP rate limit, and the same error for wrong email or wrong password. |
| Stale permissions | Deactivating a user, changing a role or resetting a password takes effect on the next request and ends their sessions. |

## Validation, errors and logs

- Required fields are checked in the form and again on the API.
- The due date can't be before today or before the date the task was assigned.
- Every error has one shape, and its `requestId` matches the server log line:
  `{ "error": { "message", "details": [{ "field", "message" }], "requestId" } }`
- Server logs are structured (Pino) with request ID, user and status. Auth events are logged as warnings. Set `LOG_LEVEL=debug` for more.

## Emails

- **Assigned →** the assignee is emailed.
- **Status changed →** the task creator is emailed.

Nobody is emailed about their own action. Without `SMTP_HOST`, emails are written to the log.

## API summary

| Route | Who |
|---|---|
| `POST /auth/login · /auth/refresh · /auth/logout · /auth/logout-all`, `PATCH /auth/password`, `GET /auth/me` | session |
| `GET/POST /users`, `GET/PATCH /users/:id` (active users only; no DELETE route, `PATCH { isActive: false }` deletes) | admin |
| `GET /teams`, `GET /teams/:id` | everyone |
| `POST /teams`, `PATCH/DELETE /teams/:id`, `POST/DELETE /teams/:id/members[/:userId]` | admin |
| `GET /projects`, `GET /projects/:id` | people on the project, admin |
| `POST /projects`, `PATCH/DELETE /projects/:id`, `POST/DELETE /projects/:id/teams…` and `/members…` | admin |
| `GET/POST /tasks`, `GET/PATCH /tasks/:id` (no DELETE; close with `status: "closed"`) | people on the project |
| `GET /tasks/:id/activity`, `GET/POST /tasks/:id/comments`, `PATCH /tasks/:id/comments/:commentId` | people on the project |

## Tests

`cd server && npm test` runs API integration tests against an in-memory MongoDB. The first run downloads a MongoDB binary.
