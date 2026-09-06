# Trekkenture Registration Service

A small registration app with a React frontend and NestJS/PostgreSQL backend.

## The flow

1. Log in as admin.
2. Open **Question library** to create/edit groups and questions.
3. Create a form by adding groups and choosing questions. Set each question's required flag and, where relevant, edit its options or number/date limits.
4. Save a draft, return to it later, then publish. Unwanted drafts can be permanently deleted from the forms list.
5. Share `/forms/<slug>`. Public users fill in the saved questions.
6. View responses or download Excel. Close/reopen registrations when needed.

The library supplies defaults. Each saved form owns its question definitions, so library edits and deletions cannot change forms already saved. Start with an empty form, add groups from the picker, then choose their questions. Groups open as accordions and can be dragged into the desired order, which is retained in preview, public forms and Excel. Payment is an optional group: including it always adds advance/total amounts and a required transaction number. Extra payment questions can be selected individually.

## Developer walkthrough

- [Backend README](./trekkenture-registration-api/README.md): the four-table schema, source-file walkthrough, validation, migration, authentication, and API examples.
- [Frontend README](./trekkenture-registration-form/README.md): pages, components, navigation, and browser behavior.

The backend has three main areas: `questions` maintains the library, `events` saves/publishes forms and exports responses, and `submissions` validates/stores answers. Direct controllers and services handle these flows; no extra abstraction layers are needed.

## Local start

PostgreSQL must be running. Create the database configured in the API's ignored `.env`; use each app's `.env.example` as a starting point. Keep your readable administrator password in `ADMIN_PASSWORD`; the API hashes it in memory.

```powershell
cd trekkenture-registration-api
npm install
npm run migration:run
npm run start:dev
```

In another terminal:

```powershell
cd trekkenture-registration-form
npm install
npm run dev
```

Open `http://localhost:3001/admin/login`. The username defaults to `admin`. Public forms use `http://localhost:3001/forms/<slug>`.

One initial migration creates the four application tables and inserts the four basic groups and 17 questions. Run it against a fresh database; repeated runs skip the already-applied migration. See the backend README for setup details.

## Verification

```powershell
cd trekkenture-registration-api
npm run build
npx tsc --noEmit --incremental false
npm test -- --runInBand
npm run test:e2e -- --runInBand

cd ..\trekkenture-registration-form
npx tsc --noEmit
npm run build
npm test
```

Backend integration tests create and remove their own temporary PostgreSQL database. They require a database user with CREATE DATABASE permission. They use independent test credentials and disable email delivery.
