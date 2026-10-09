# CivicTrack v2.2.2

CivicTrack is a civic infrastructure transparency, verification and accountability platform.

## v2.2.2 changes

- Public browsing is the default: dashboard, public projects, nearby projects, map, public issues and public evidence do not require login.
- There is no forced `/login` page for browsing.
- Login/register opens as an in-context modal only when a protected action is attempted.
- After authentication, the user continues to the requested protected action.
- Added authenticated project comments with audit logging.
- Public project details include published comments.
- Private projects are not exposed through public project-detail access.
- Public complaint listing excludes complaints linked to private projects.
- Added migration `003_v221.sql`.
- API health reports version `2.2.2`.

## Local setup

Requirements:

- Node.js 20+
- pnpm 10+
- Docker Desktop with the Linux engine running

1. Copy `.env.example` to `.env` and replace the development secrets.
2. Start services:

```powershell
pnpm docker:up
```

3. Install packages:

```powershell
pnpm install
```

4. Run all database migrations:

```powershell
pnpm db:migrate
```

5. Create the development administrator:

```powershell
pnpm db:seed-admin
```

6. Start the API and web app:

```powershell
pnpm dev
```

Web: `http://localhost:3000`

API health: `http://localhost:4000/health`

PostgreSQL/PostGIS: `localhost:5432`

MinIO API: `localhost:9000`

MinIO console: `http://localhost:9001`

## Important

CivicTrack does not fabricate public project records. If the database contains no public projects, the public UI shows an empty state.

Camera capture requires browser camera permission. Evidence upload also requires the MinIO service to be running.

Login has no role selector. Public registration creates a CITIZEN account; elevated roles are granted by authorized administration.


### v2.2.2 UI behavior
Public users can browse the registry and nearby projects without opening a login page. Authentication is invoked only from protected actions such as filing a complaint, commenting, supporting an issue, or submitting evidence.
