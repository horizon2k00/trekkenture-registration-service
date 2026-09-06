# Trekkenture Registration API

A small NestJS/PostgreSQL service: maintain a question library, build a form, publish it, and collect/export answers.

## Start here

Follow these files in order for a first walkthrough:

1. `questions/questions.controller.ts` and `questions.service.ts`: read and edit the question library.
2. `events/events.controller.ts` and `events.service.ts`: save drafts and change form status.
3. `events/form-definition.ts`: copy selected questions into a form, apply required/options/min/max choices, and check publishing readiness. `questions/question-bounds.ts` validates limits for both library questions and saved forms.
4. `submissions/validate-answers.ts` and `submissions.service.ts`: validate against the saved form and insert one response.
5. `events/reporting.service.ts`: write saved question headings and answers to Excel.

All paths above are inside `src/`. Controllers handle HTTP, services handle database work, and the two plain validation/configuration files have no database dependency. There is no generic form engine or catalog version system.

## Database: four tables

| Table | What it holds |
| --- | --- |
| `question_groups` | `id`, `name`, and optional explanatory `description`. |
| `questions` | `id`, `groupId` (foreign key), question wording, field/answer types, default options, and optional min/max. |
| `events` | A form's name, unique slug, status, saved `questions` and `groups`, optional payment amounts, and timestamps. |
| `submissions` | `eventId` (foreign key), an `answers` object keyed by question ID, and submission time. |

`events` keeps its existing table/class name; each event is one registration form.

The library is reusable starting content. A saved form owns a copy of its questions and group descriptions. Required flags, option overrides and number/date limits belong to that copy. Editing or deleting library items never silently changes existing forms, submissions, or export headings. Saving an existing draft retains its selected copies. To use a revised library question in that draft, remove it, save, then add it again.

The form copies and answers are JSONB because each form has a different set of questions. Everything needed to render and validate one form is visible in its row. There are no per-answer tables or schema joins to reconstruct a response. Deleting a group containing questions returns 409; move or delete those questions first. Deleting a library question leaves saved form copies intact.

The migration seeds the original four groups (terms, student, parent, payment) and 17 questions into the database. The terms and important notes are retained as the terms group's description. Library records are editable, with one fixed minimum: the built-in `payment` group and its `payment.utr` text/string question cannot be deleted or separated. Their labels remain editable, and additional payment questions use ordinary CRUD.

## Question types

| Field type | Answer stored | Configuration |
| --- | --- | --- |
| `text` | String or number | `answerType`: string, number, date, email, or phone. |
| `dropdown`, `radio` | One option string | Default options, editable per form. |
| `checkbox` | Boolean | Checked stores `true`, unchecked stores `false`; required means checked. No options. |

Only number and date text answers have optional `min`/`max`. Bounds are stored as strings (for example `"5"` or `"2026-09-05"`); validation compares numbers numerically and ISO dates chronologically. A number answer must be a JSON number; a string answer must be a JSON string. Numeric-looking text is valid for string answers. Dates must be real `YYYY-MM-DD` dates. Email uses basic syntax validation; phone requires ten digits, allowing formatting punctuation. Empty optional answers are omitted, except optional checkboxes always store `false` when unchecked or omitted. Explicit checkbox answers must be booleans; null, strings, numbers, and arrays are rejected. Older stored array answers remain readable and exportable.

## Form flow

```text
Question library -> Save draft -> Publish -> Public answers -> Responses / Excel
                                    |
                                 Close <-> Reopen
```

Drafts may be incomplete, including added groups without questions, and are hidden publicly. Publishing requires at least one question in every selected group, options for dropdown/radio questions, and both payment amounts if the Payment group is selected. Only drafts can be edited. Closed forms show a closed notice and reject submissions. Reopening checks the same publishing rules and preserves the same form.

For number/date questions, optional `min` and `max` overrides use strings. Omit a limit to retain the saved value (or library default on first selection); send null to remove it. Numeric limits must be finite, date limits must be real ISO dates, and minimum cannot exceed maximum. Overrides are stored only in the form snapshot and used by public answer validation.

Example create/save body:

```json
{
  "name": "Forest camp",
  "slug": "forest-camp",
  "groupIds": ["student"],
  "questions": [
    { "id": "student.fullName", "required": true },
    { "id": "student.age", "required": true, "min": "10", "max": null },
    { "id": "student.section", "required": false, "options": ["A", "B", "Visitors"] }
  ],
  "advancePayment": null,
  "totalPayment": null
}
```

The API resolves those IDs to complete saved question and group definitions. Both create and draft-save requests send the complete editable configuration. `groupIds` defines the group order, saved in the existing `events.groups` JSON array; no separate ordering table or column is needed. Every selected question must belong to a selected group. Questions keep their selection order within each group. Public forms, response tables, and exports all use that order. Older clients can omit `groupIds` to infer groups from the first appearance of their questions.

Payment is optional as a whole group. Selecting any question in `payment` requires `payment.utr` to be included with `required: true`; other payment questions are optional selections. Advance and total amounts remain simple columns on `events`, configured by the admin and displayed alongside UPI instructions inside Payment. Drafts can leave amounts blank; publishing or reopening requires both amounts and a configured UPI_ID. Removing Payment removes all its questions and sets both amounts to null. The app records the transaction number; it does not verify payment with a gateway.

Draft saves, status changes, and submissions lock the same form row inside their database transaction. This keeps a concurrent save from changing a just-published form and prevents new responses after closing. This is the one concurrency safeguard worth retaining here.

`DELETE /admin/forms/:id` permanently removes a draft and returns 204. Missing forms return 404; published and closed forms return 409. Deletion takes the same row lock as publishing/saving so a draft cannot be deleted after a concurrent publish. Deleting a draft frees its public slug and leaves the question library intact.

## Local setup

Copy `.env.example` to the ignored `.env`. Set database credentials, `JWT_SECRET`, and `ADMIN_PASSWORD`. The username defaults to `admin`.

`ADMIN_PASSWORD` is intentionally the original readable password for local debugging. At startup the API derives an in-memory scrypt hash with a random salt; login derives and compares hashes using a constant-time comparison. No hash-generation command or second password setting is needed. Existing plain-text `ADMIN_PASSWORD_HASH` settings should be renamed to `ADMIN_PASSWORD`.

```powershell
npm install
npm run migration:run
npm run start:dev
```

Create the PostgreSQL database named by `DB_NAME` first. The API defaults to port 3000. TypeORM synchronization is disabled. `database.config.ts` supplies the same connection/entity configuration to the API and migration CLI.

`src/migrations/1788652800000-InitialSchema.ts` is the single initial migration. It creates the current four-table schema directly and inserts the four default groups and 17 questions. TypeORM records it in the small `migrations` table, so running `npm run migration:run` again leaves existing data unchanged. This baseline replaces the old development migrations and requires a fresh database; it does not upgrade an older schema. `npm run migration:revert` removes all four application tables and their data.

| Environment | Purpose |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection. |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Single administrator login. |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Signing secret and session duration (default 8 hours). |
| `UPI_ID`, `UPI_PAYEE_NAME`, `UPI_CURRENCY` | Payment instructions. |
| `SMTP_*` | Optional confirmation email; leave blank to disable. |
| `PORT`, `CORS_ORIGIN`, `DB_LOGGING` | HTTP configuration and optional SQL logging. |

Optional confirmation emails retain the existing parent/student email convention. They run after the response is committed; delivery failure does not lose the registration. Application logs omit credentials and answer payloads.

## Routes

All `/admin/*` routes require `Authorization: Bearer <token>`.

| Method | Route | Action |
| --- | --- | --- |
| POST | `/auth/login` | Username/password to JWT. |
| GET | `/admin/form-catalog` | Database groups and questions. |
| POST | `/admin/question-groups`, `/admin/questions` | Create a library item. |
| PUT, DELETE | `/admin/question-groups/:id`, `/admin/questions/:id` | Replace/delete a library item. |
| GET, POST | `/admin/forms` | List forms / create draft. Optional GET status filter. |
| GET | `/admin/forms/payment-settings` | Read UPI display settings for admin previews; same settings as public forms. |
| GET, PATCH | `/admin/forms/:id` | Read / save a complete draft configuration. |
| POST | `/admin/forms/:id/publish`, `/close`, `/reopen` | Change form status. |
| GET | `/admin/forms/:id/submissions` | Read responses. |
| GET | `/admin/forms/:id/submissions/export` | Download XLSX. |
| GET | `/forms/:slug` | Read public form or closed notice. |
| POST | `/forms/:slug/submissions` | Validate and store `{ "answers": { ... } }`. |

## Verification

Compile before running tests:

```powershell
npm run build
npx tsc --noEmit --incremental false
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

The E2E suite uses the configured PostgreSQL connection to create a uniquely named temporary database, runs migrations, supplies its own admin credentials, and drops only that temporary database afterward. The database user needs permission to create databases. It never clears your application database and disables SMTP.
