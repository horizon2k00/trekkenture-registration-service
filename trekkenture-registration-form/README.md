# Trekkenture registration UI

React pages for administering the question library, building registration forms, and accepting public responses. The backend supplies every group, question and saved form definition; there is no second catalog in the UI.

## Start here

1. `App.tsx` lists all routes. `auth.tsx` protects admin routes with a session token.
2. `pages/QuestionLibraryPage.tsx` manages database-backed groups and questions.
3. `pages/FormBuilderPage.tsx` adds groups in order, selects their questions and saves a draft with per-form required flags and options.
4. `pages/FormsDashboardPage.tsx` publishes, closes and reopens forms.
5. `pages/PublicFormPage.tsx` shows the saved form, payment instructions and submission result. `components/QuestionField.tsx` renders the four field types with native browser controls.
6. `pages/ResponsesPage.tsx` displays responses; `api.ts` handles JSON requests and protected Excel downloads.

`components/RegistrationForm.tsx` renders the shared public layout. `components/FormPreview.tsx` uses it for interactive previews with submission disabled; `pages/FormPreviewPage.tsx` loads saved snapshots for dashboard previews.

`types.ts` describes the API objects. `components/OptionsEditor.tsx` is the shared option editor used by the library and builder, with Add option, Delete and drag handles for reordering. `components/SortableList.tsx` uses dnd-kit for group and option row movement, with pointer-following transforms, animated placement and keyboard arrows. Option row IDs stay local to the editor; the API still receives plain strings.

## Routes

| Route | Purpose |
| --- | --- |
| `/admin/login` | Username/password login; username defaults to `admin` |
| `/admin/questions` | Create, edit and delete questions within groups; create, edit and delete groups |
| `/admin/forms` | Active/all forms and lifecycle actions |
| `/admin/forms/new` | Create a draft |
| `/admin/forms/:id/edit` | Edit a draft |
| `/admin/forms/:id/preview` | Preview a saved draft, published or closed form without submitting answers |
| `/admin/forms/:id/responses` | Review responses and export Excel |
| `/forms/:eventSlug` | Public registration or closed notice |

Admin routes require login. Tokens use `sessionStorage`; an expired session returns to login. Public requests do not include an admin token.

## Questions and forms

A group has a name and optional description/instructions. A question belongs to one group and has question text and a field type: text, dropdown, radio or checkbox. Text inputs have an answer type: string, number, date, email or phone. Number/date bounds become native input min/max attributes. Server validation remains authoritative, including phone validation.

Group edits open inside the group; question edits replace that question's row. New questions open inside the group where Add question was clicked. The Group dropdown shows that group and stays disabled during creation and editing. Save applies the changes and Cancel restores the existing item.

Only dropdown/radio questions have options. Add each option in its own text input; drag its handle to another row to reorder with a mouse or touch. Keyboard users can focus a handle and press the up/down arrows. Empty or duplicate rows must be completed or removed before saving. Optional radio answers can be cleared.

A checkbox always stores one boolean: checked is `true`, unchecked is `false`. A required checkbox must be checked, which is useful for accepting terms; an optional checkbox may stay unchecked. Text and checkbox questions have no option editor. Switching field/answer types clears settings that no longer apply.

Library options are defaults. The builder starts empty. Choose a group from Add a group to open its question choices; adding another group collapses the previous one. Click a group's header to open or close it. Choose questions, mark each required or optional, and edit their options for this form. Drag group handles to set the form's order. Remove clears a group's selected questions and makes it available in the picker again. Drafts can retain groups without selected questions; publishing requires a question in every added group and options for choice questions. Event name and slug are needed to save a draft.

Preview in the builder shows the current unsaved selection, required flags, option order and payment amounts. Back to editing preserves the draft. Preview answers are temporary, and submissions are disabled. The forms list also has Preview for each saved form, including drafts and closed forms. Previewing never saves, publishes or reopens a form. Payment previews use the same server UPI settings as public forms; missing amounts or account settings are shown explicitly.

Selected number/date questions also show editable minimum and maximum inputs, initially copied from the library. Clearing an input removes that limit. `components/BoundsEditor.tsx` is shared with the question editor. Form overrides survive collapsing groups, saving and reopening drafts, and apply in preview and public validation without changing the library defaults.

Forms keep snapshots of their questions and groups. Changing or deleting a library question does not alter an existing form. The builder merges saved questions into the available choices so an old draft still works after library changes. A group must be empty before deleting it; delete its questions first.

Adding Payment from the group picker adds advance/total amount controls and the required transaction number question together. The transaction question cannot be deselected or made optional; extra payment questions can be added or removed individually. Removing Payment clears its questions and amounts. Draft amounts can stay blank until publishing. Preview and public pages show amounts, UPI QR, copyable payment ID and transaction number inside the same Payment section. Amounts are configured by the admin, not entered by respondents.

The dashboard opens on All forms so a newly saved draft is visible immediately; Active filters to published forms. Drafts can be edited, published or permanently deleted. Delete opens an inline confirmation with Delete permanently and Cancel; errors keep the row available for retry. Published and closed forms have no delete action. Published forms can be closed; closed forms can be reopened with their saved questions unchanged. Responses use question IDs as answer keys. Checkbox values appear as Yes/No in the table and Excel file.

## Run locally

Copy `.env.example` to the ignored `.env`:

```dotenv
VITE_API_URL=http://localhost:3000
```

```powershell
npm install
npm run dev
```

Vite serves `http://localhost:3001`. Set the API's `CORS_ORIGIN` to this origin. Hosting must send unknown UI routes to `index.html` for direct links to work.

## Verify

```powershell
npx tsc --noEmit
npm test
npm run build
```

The UI tests cover login/protected routes, group/question CRUD, empty drafts, deleted-question snapshots, required/options overrides, option add/edit/delete/reorder and validation, field/answer type switching, payment configuration, public field types and submission payloads, required terms and optional boolean checkboxes, optional radio clearing, response display, lifecycle actions and authenticated Excel download. API validation and actual database/Excel contents are verified by the backend tests.
