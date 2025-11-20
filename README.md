# Quiz Management System

This repository houses a production-ready, full-stack Quiz Management System designed around a MySQL backbone. It ships with a TypeScript/Express API, a modern React + Vite SPA, and deep MySQL artefacts (migrations, seeds, triggers, and procedures) that mirror production expectations.

## Repository layout

- `backend/` – TypeScript/Express service that exposes REST endpoints for authentication, quizzes, assignments, and attempts.
  - `src/` – Config, middleware, controllers, services, and repositories structured around clean architecture principles.
  - `db/` – Knex migrations, deterministic seeds, and migration-managed stored procedures, triggers, and functions aligned with the ERD.
  - `docs/` – Generated API reference (planned) and operational runbooks.
- `frontend/` – React + Vite single-page app with React Query, Zustand, and Tailwind-powered UI for teachers and students.
- `docs/architecture.md` – Authoritative system blueprint covering domain model, data flow, and deployment topology.

Legacy prototype assets (one-off SQL dumps and the static Firebase demo UI) were removed to keep the public repository focused on the production stack.

## Backend feature set

- JWT-based authentication with access and refresh tokens.
- Role-based authorization for students, teachers, and admins.
- Quiz delivery lifecycle: authoring, scheduling, assignment, attempts, grading scaffolding.
- Request validation powered by Zod schemas and centralized error handling.
- Structured logging via Pino/Pino-HTTP with request correlation.
- Knex-powered data access layer with migration-based schema management.
- Prepared hooks for advanced MySQL features (stored procedures, triggers, and analytics views).

## Getting started

### Prerequisites

- Node.js 20+
- npm 10+
- MySQL 8.x instance accessible to the application

### 1. Clone the repository

```bash
git clone <repository-url>
cd QuizManagementSystem
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Fill in the `.env` with your database credentials. If `JWT_SECRET` or `JWT_REFRESH_SECRET` are left blank, the app will auto-generate secure fallbacks at runtime.

Prepare your database and load the seed data:

```bash
npm run migrate
npm run seed
```

Start the API (this uses `tsx` for hot reloading):

```bash
npm run dev
```

The service listens on `http://localhost:4000` by default and exposes REST endpoints under `/api/v1`.

### 3. Frontend setup

Open a second terminal in the repository root:

```bash
cd frontend
npm install
```

Create a `.env.local` (or `.env`) file to point the SPA at your API:

```bash
echo "VITE_API_URL=http://localhost:4000/api/v1" > .env.local
```

Then launch the Vite dev server:

```bash
npm run dev
```

The frontend becomes available on `http://localhost:5173` with automatic proxying to the API URL you configured.

### 4. Full-stack workflow tips

- Keep the backend and frontend dev servers running in separate terminals for live reload on both sides.
- Use the seeded teacher account (`teacher@quizmaster.dev` / `Password123!`) to explore authoring workflows, and the seeded student account (`student@quizmaster.dev` / `Student123!`) to attempt quizzes.
- When assigning a quiz, you can provide either the learner's numeric ID or their email address—use the seeded accounts above or any student records you create.
- If you need a clean slate, run `npm run db:reset` in `backend/` to drop, recreate, migrate, and reseed the schema.

### 5. Managing quizzes and questions

- Teachers and admins can delete an entire quiz (including its questions) from the Dashboard via the new **Delete quiz** button. The UI prompts for confirmation and disables the action while the request is in flight.
- Individual questions can be removed directly from the quiz detail page. Each deletion also requires confirmation and automatically refreshes the quiz data once the backend responds.
- The backend enforces ownership/role checks on `DELETE /api/v1/quizzes/:quizId` and `DELETE /api/v1/quizzes/:quizId/questions/:questionId`, ensuring only quiz owners or admins can perform destructive operations.
- Students cannot start an attempt on a quiz with zero questions; the frontend now communicates this state and the validator accepts empty response arrays for future-proofed attempt creation.

### 6. Production builds and quality checks

- **Backend**
  - `npm run build`
  - `npm run lint`
  - `npm run test`
- **Frontend**
  - `npm run build`
  - `npm run lint`
  - `npm run test`

Build artifacts land in `backend/dist/` and `frontend/dist/` respectively, ready to be served by your hosting environment of choice.

## Database assets

- `db/migrations/202411070001_init_schema.ts` – Canonical schema definition kept in version control.
- `db/migrations/202411070002_add_routines.ts` – Stored procedure, trigger, and function definitions deployed alongside schema changes.
- `db/seeds/01_seed_core.ts` – Deterministic sample data (admin, teacher, student, quiz, assignment, attempt) used by the quick-start walkthrough.
- `db/procedures/` – Source-of-truth SQL for MySQL routines, generated from the TypeScript migrations for auditing.

Useful scripts:

```bash
npm run migrate   # apply latest schema changes
npm run seed      # insert canonical sample data
npm run db:reset  # drop, recreate, migrate, and reseed the database
```

## Documentation

- Start with `docs/architecture.md` for a holistic view of the system.
- ADRs, API reference, and deployment runbooks will be expanded as the project evolves.

## Roadmap

- Implement database seeds and stored procedures extracted from the original research artifacts.
- Deliver the React SPA frontend and integrate with the API.
- Add comprehensive unit, integration, and contract tests.
- Publish Docker Compose configuration and CI/CD workflows for repeatable deployments.
