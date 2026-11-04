# Feature: Rich-Text Document Templates (Brīvā teksta dokumentu veidnes)

**Status:** design — not yet implemented
**Applies to:** a new form *type*, parallel to F001–F012, admin-authored rather than code-authored
**Author:** design session 2026-11-04

---

## 1. Business context

F001–F012 are structured forms: every field is a discrete input (text, number,
boolean, select) defined in code (`src/lib/form-definitions.ts`) and rendered
field-by-field by `FormRenderer`. That works for protocols with a fixed set of
measurements.

Some reports don't fit that shape. The eight reference photos supplied for
this feature (ultrasound reports for abdomen, thyroid, hip joints and
neurosonoscopy) are a title, a block of prose with a few bold labels, and a
conclusion — the sonographer types a paragraph, not a grid of fields. Forcing
that into `FormDef`/`FormField` would mean one field per sentence with no
real structure to validate or calculate from.

This feature adds a second form type: a **named rich-text template**, created
and edited by practice staff in a new **admin mode**, with **no code change
and no deploy** required to add a new document type. On the user side, a
doctor picks a template by name, picks (or creates) a patient, and gets an
editable copy of that template's text — which they format freely (bold,
italic, font size) exactly like a word processor — then print/PDF it, same as
any other statement.

The defining contrast with F001–F012's existing template feature
([feature-templates.md](feature-templates.md)): that feature lets a doctor
save *their own* filled-form snapshots into numbered slots (T01…T12) via a
toolbar, for forms whose shape is fixed in code. This feature is the
opposite — the *shape itself* (there is no shape beyond "one rich-text body")
is defined once by an admin and selected by name; there is no in-editor
template-switching toolbar, because switching only ever happens once, at
creation.

---

## 2. Functional requirements

| # | Requirement | Priority |
|---|-------------|----------|
| FR-1 | An admin can create, edit and archive named document templates, each with a rich-text body. | Must |
| FR-2 | A doctor can pick a document template by name from the same entry screen used for F001–F012. | Must |
| FR-3 | Starting a document requires choosing an existing patient or creating a new one (name + birth year, optional personal code). | Must |
| FR-4 | Starting a document copies the template's current body into a new, independently-editable statement. | Must |
| FR-5 | The editor lets the doctor select text and apply bold, italic, and one of a small set of font sizes. No other formatting is exposed. | Must |
| FR-6 | Editing autosaves, on the same blur/debounce cadence as F001–F012. | Must |
| FR-7 | A finished document prints/PDFs and appears in the midwife's daily list exactly like any other statement. | Must |
| FR-8 | Editing a template after documents have been created from it never changes those documents. | Must |
| FR-9 | A document's clinical content is purged after 12h, same as F001–F012 — this feature does not change that retention window. | Must |
| FR-10 | The patient roster (name/birth year/personal code) persists beyond the 12h window, so it can be searched when starting a later document. | Must |

---

## 3. Chosen design and rejected alternatives

Four decisions were made up front, with rejected alternatives recorded here
for anyone revisiting this later.

### 3.1 Patient roster is persistent — a real change to the privacy model

**Chosen:** a new `patients` table, searchable, outliving the 12h statement
purge.

**Rejected: inline/ephemeral patient fields**, i.e. reusing today's model
where `patient_name`/`patient_birth_year` are just typed into the statement
and purged with it. This is what F001–F012 do today, and
[feature-templates.md §4.2](feature-templates.md) explicitly chose *not* to
retain patient identity anywhere permanent, specifically to avoid a GDPR
incident. "Choose **or create** a patient" (as opposed to "type a name") only
makes sense if there is something to choose *from*, so this feature
knowingly reverses that earlier decision for itself.

**⚠️ This needs a compliance sign-off, not just a code review.** Storing a
persistent, searchable patient roster — even just name + birth year — is a
different legal posture than purge-everything-in-12h. If `personal_code`
(Personas kods) is stored on `patients` too, that is a national identifier
and the retention/consent basis should be confirmed with whoever handles the
practice's GDPR obligations before this ships. §4.1 keeps `personal_code`
optional and never writes it into any `doc_templates` row (same rule
`sensitive` fields already follow for F001–F012), but the `patients` row
itself is the new exposure and is out of this document's authority to
approve.

Nothing about F001–F012's own patient handling changes — their
`patient_name`/`patient_birth_year` stay inline and purge with the row, same
as today. The roster is additive, used only by this feature.

### 3.2 Documents live in `statements`, not a new table pair

**Chosen:** extend `statements` with nullable `template_id`/`body_html`/
`patient_id` columns; a document *is* a statement with those columns set and
`form_id`/`form_data` unused.

**Rejected: parallel `documents` + a join to `doc_templates`-only storage.**
`statements` already owns doc-number allocation, the midwife's one daily
list, `PrintView`'s print pipeline, and the 12h purge job. A parallel table
would need its own doc-number sequence (or a shared one anyway), and the
midwife page would have to fetch and interleave two lists by time — exactly
the kind of merge logic `feature-templates.md` avoided by putting the
template bar inside `FormRenderer` instead of lifting state out of it. One
`statements` row with a nullable discriminant (`template_id IS NOT NULL`)
keeps one writer, one purge query, one daily list.

`doc_templates` (the admin-authored seed text, see §4.1) is still its own
table — it is not a statement, it never has a doctor/patient/visit date, and
multiple statements reference one template row the same way multiple
statements reference one `doctors` row.

### 3.3 Editor: Tiptap

**Chosen:** [Tiptap](https://tiptap.dev) (`@tiptap/react` + `@tiptap/starter-kit`
+ `@tiptap/extension-text-style`), React 19-compatible, ProseMirror-based.
`editor.getHTML()` is the stored representation directly — no separate
"export to HTML" step.

**Rejected: plain `contentEditable` + `document.execCommand`.** Zero new
dependency, but `execCommand` is a deprecated API with browser-specific
quirks (exact `<b>` vs `<strong>` output, inconsistent undo behavior) that
would show up as "the bold button doesn't work right on the tablet" bug
reports. A clinic tool used daily by non-technical staff should not be the
place to debug that.

Tiptap's own toolbar chrome is not used — the toolbar is five custom buttons
(§7), and every Tiptap extension except `Bold`, `Italic`, `Paragraph`,
`History` and the custom font-size mark (§7.1) is left out of the editor's
`extensions` array, so paste-in formatting from Word etc. is normalized away
rather than smuggling in headings, tables, or images the UI never exposes.

### 3.4 Seed templates: six, one per source document — not collapsed per organ

The eight reference photos are not eight distinct templates. Comparing them
pairwise:

- Photos 4 and 5 are two **different patients'** actual abdomen reports,
  both typed against the same "Vēdera dobuma US." house style (same clinic,
  same doctor) — one template, two filled examples.
- Photos 3 and 8 are the same relationship for thyroid ("Vairogdziedzera
  US.") — one has cysts described, the other is normal, but it's the same
  underlying template.
- Photos 1 and 2 are a different, older, unbranded (typewriter-style) source
  — a different house style for abdomen and thyroid respectively, distinct
  from the Ultra Express pair above.
- Photos 6 (hip joints) and 7 (neurosonoscopy) are each their own template,
  one example each.

So the six *template identities* are: the two older-format templates (photo
1, photo 2), four Ultra Express templates (abdomen, thyroid, hips, neuro),
with the abdomen and thyroid Ultra Express templates each synthesized from
their two filled examples into one canonical body. This still produces six
named templates, matching the chosen direction, but by merging true
duplicates rather than keeping two differently-worded abdomen templates
side by side. Full seed content is in §12.

---

## 4. Data model

### 4.1 `doc_templates` — admin-authored, permanent

```sql
CREATE TABLE IF NOT EXISTS doc_templates (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  body_html   TEXT         NOT NULL DEFAULT '',
  active      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

`active = false` removes a template from the doctor-facing picker (§8.2)
without deleting it or breaking the `template_id` FK on statements already
created from it — "Dzēst" (hard delete) is also offered in admin, and is
safe regardless (see `ON DELETE SET NULL` below), but archiving is the
recommended path once a template has real documents against it.

`body_html` is sanitized server-side before every write (§6.4) — this is the
one place admin-authored HTML becomes the seed for every document created
from it, so a stored-XSS bug here would replicate app-wide.

### 4.2 `patients` — persistent roster (see §3.1 privacy note)

```sql
CREATE TABLE IF NOT EXISTS patients (
  id             SERIAL       PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  birth_year     INTEGER,
  personal_code  VARCHAR(32),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_name ON patients (lower(name));
```

Scoped to this feature only. F001–F012 do not read or write this table.

### 4.3 `statements` — extended, not replaced

```sql
ALTER TABLE statements ALTER COLUMN form_id DROP NOT NULL;
ALTER TABLE statements ADD COLUMN IF NOT EXISTS template_id   INTEGER REFERENCES doc_templates(id) ON DELETE SET NULL;
ALTER TABLE statements ADD COLUMN IF NOT EXISTS template_name VARCHAR(100);
ALTER TABLE statements ADD COLUMN IF NOT EXISTS body_html     TEXT;
ALTER TABLE statements ADD COLUMN IF NOT EXISTS patient_id    INTEGER REFERENCES patients(id) ON DELETE SET NULL;
```

- **`form_id` becomes nullable.** A document row leaves it `NULL`; every
  code path that currently assumes `form_id` resolves through `FORM_MAP`
  (doctor page, `FormRenderer`, `PrintView`, midwife) must branch on
  `template_id IS NOT NULL` first. `form_data` is simply unused (stays `{}`)
  on a document row — not repurposed, so there's no ambiguity about which
  field means what.
- **`template_name` is a snapshot**, copied from `doc_templates.name` at
  creation time. It is what the midwife list and print header display, so a
  template rename or delete afterward never relabels an existing document —
  same "replace, don't drift" rule F001–F012's own templates already follow
  (§4.1 of feature-templates.md).
- **`patient_id` is the durable link; `patient_name`/`patient_birth_year`
  stay as the display columns**, exactly as they are today for F001–F012.
  A document never writes `patient_name`/`patient_birth_year` directly —
  those columns are resolved via `COALESCE` against a `LEFT JOIN patients`
  in every `SELECT` (§6.3), the same pattern `doctor_name` already uses via
  `LEFT JOIN doctors`. This means `PrintView`'s header, the midwife table,
  and the "done" screen need **no changes** — they already read
  `statement.patient_name`; it just now resolves from a join instead of a
  column for document rows. A later correction to a patient's name in the
  roster is reflected on reprint, which is the desired behavior for a
  roster meant to be the source of truth.

No change to `doctors`, `form_templates`, or anything F001–F012 touch.

### 4.4 What the purge job does and does not touch

`cron/purge-statements` deletes `statements` rows older than 12h — unchanged,
and it deletes document rows exactly like structured-form rows (same table,
same `created_at`). `doc_templates` and `patients` are permanent, alongside
`doctors` and `form_templates` — the purge query is untouched and does not
need to know this feature exists.

---

## 5. New types (`src/lib/types.ts`)

```ts
export interface DocTemplate {
  id: number;
  name: string;
  body_html: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: number;
  name: string;
  birth_year: number | null;
  personal_code: string | null;
  created_at: string;
  updated_at: string;
}
```

`Statement` gains:

```ts
template_id: number | null;
template_name: string | null;
body_html: string | null;
patient_id: number | null;
```

---

## 6. API contract

### 6.1 `src/app/api/doc-templates/route.ts`

`GET` — list, `?active=true` filters for the doctor-facing picker (admin
fetches all). `POST {name, body_html}` — sanitizes `body_html` (§6.4),
inserts, returns 201.

### 6.2 `src/app/api/doc-templates/[id]/route.ts`

`PUT {name?, body_html?, active?}` — same sanitize-on-write as POST.
`DELETE` — hard delete; `ON DELETE SET NULL` on `statements.template_id`
means existing documents keep their `template_name` snapshot and `body_html`
untouched.

### 6.3 `src/app/api/patients/route.ts`

`GET ?q=<search>` — `WHERE name ILIKE '%' || q || '%' ORDER BY name LIMIT 10`,
for the picker's search-as-you-type (§8.3). `POST {name, birth_year?,
personal_code?}` — creates and returns one row; used by the picker's
"+ Jauns pacients" path.

### 6.4 Sanitization (`src/lib/sanitize-html.ts`, new)

A single allow-list sanitizer (e.g. `isomorphic-dompurify`, new dependency,
works in the Node route handlers) used by both `doc-templates` writes and
`statements` writes (§6.5):

```ts
const ALLOWED_TAGS = ['p', 'br', 'b', 'strong', 'i', 'em', 'span'];
const ALLOWED_ATTR = ['style']; // font-size only, enforced by the editor's own mark
```

Belt-and-braces with the editor extension allow-list in §7.1 — the editor
can only ever produce these tags, but the API does not trust the client.

### 6.5 `statements` routes — additions

`POST /api/statements` gains a document path: body carries `template_id`,
`patient_id`, `doctor_id`, `visit_date` (no `form_id`). The handler:

1. `SELECT name, body_html FROM doc_templates WHERE id = ${template_id} AND active`
   — 404/400 if missing or archived.
2. Allocates `doc_id` exactly as today (shared sequence, no change).
3. Inserts with `form_id = NULL`, `template_id`, `template_name = template.name`,
   `body_html = sanitize(template.body_html)` (re-sanitized defensively even
   though it was sanitized on write), `patient_id`.

`PUT /api/statements/[id]` gains `body_html` alongside the existing
`form_data`/`patient_name`/etc. fields — same `COALESCE(new, existing)`
pattern already used for every other column, sanitized before the `UPDATE`.

`GET /api/statements?date=` and `GET /api/statements/[id]` gain the
`LEFT JOIN patients p ON p.id = s.patient_id` and
`COALESCE(s.patient_name, p.name) AS patient_name`,
`COALESCE(s.patient_birth_year, p.birth_year) AS patient_birth_year`
described in §4.3.

---

## 7. Rich text editor

### 7.1 `src/components/RichTextEditor.tsx` (new)

```ts
export interface RichTextEditorProps {
  value: string;            // HTML
  onChange: (html: string) => void;
  onBlur?: () => void;
  readOnly?: boolean;
}
```

Extensions: `StarterKit` configured with only `paragraph`, `bold`, `italic`,
`history` enabled (headings, lists, blockquote, code, etc. all disabled),
plus `TextStyle` and a small custom `FontSize` mark (Tiptap ships no
official font-size extension; this is the documented recipe — a mark that
extends `TextStyle` and reads/writes `style="font-size: …"` via
`addAttributes`/`renderHTML`, ~30 lines, lives next to the component).

Toolbar: four buttons — **B**, *I*, and a font-size `<select>` with four
steps (Latvian labels: Mazs/Parasts/Liels/Ļoti liels → 12px/14px/18px/22px),
mirroring FR-5 exactly and nothing more. No image/link/table/color — if a
future request needs those, extend the allow-lists in §6.4 and §7.1
together, deliberately, rather than letting Tiptap's defaults leak through.

### 7.2 Reused by two call sites

- Admin template editor (§8.1): editing `doc_templates.body_html`.
- `DocumentRenderer` (§9.1): editing a statement's `body_html`.

Same component, same toolbar, same sanitize-on-save path — admin and doctor
get the identical editing experience, which is the point of "no template
toolbar, just admin mode" in the original ask: the *only* difference between
admin and user mode is what happens to the result (seeds future documents,
vs. is one document), not the editing surface itself.

---

## 8. UI / interaction — admin mode

### 8.1 `src/app/admin/templates/page.tsx` (new route)

A new route rather than a tab inside the existing `/admin` (doctors) page —
`admin/page.tsx` is already a complete CRUD screen on its own, and template
bodies are large enough (a full `RichTextEditor`) that folding both into one
file/page would bury the doctor list. A nav link is added between the two
("⚙️ Administrēšana" header gains "Ārsti" / "Dokumentu veidnes" links, same
treatment `Link href="/"` gets today).

- List: name, last-updated, active/archived badge, a two-line plain-text
  preview (strip tags client-side) of `body_html`.
- "+ Jauna veidne": name input + `RichTextEditor`, empty body to start.
- Edit: same form, pre-filled; save is a `PUT`.
- Archive toggle and Delete, per §6.2.

No new auth model — consistent with the rest of the app, `/admin` has none
today and this doesn't introduce one.

---

## 9. UI / interaction — user mode

### 9.1 `src/app/doctor/page.tsx` — extended tile grid

Today, `selected.form_ids` drives a grid of `StartFormButton` tiles sourced
from the static `FORM_MAP`. This page additionally fetches
`GET /api/doc-templates?active=true` and renders one tile per template,
visually distinct (a document-style default icon, e.g. 📝, rather than a
per-form emoji — admin can be given an icon picker later, out of scope here)
and appended after the structured-form tiles.

Clicking a structured-form tile is unchanged (creates immediately, as
today). Clicking a document tile opens the patient step (§9.2) instead of
creating immediately — this is the one divergence in the entry flow, because
"choose or create patient" has to happen *before* there's a document to
write into (FR-3), whereas F001–F012 collect the patient inline as just
another field, later.

### 9.2 Patient step — `src/components/PatientPicker.tsx` (new)

A modal, opened from the document tile, before `POST /api/statements` fires:

1. Search box, debounced `GET /api/patients?q=`, results below as a list
   (name + birth year).
2. Selecting a result stages `patient_id`.
3. "+ Jauns pacients" reveals inline name/birth-year/personal-code inputs;
   saving `POST`s the patient, stages the returned `id`.
4. "Izveidot" is disabled until a patient is staged; on click, `POST
   /api/statements` with `template_id`, `patient_id`, `doctor_id`,
   `visit_date`, then redirects to `/document/[id]` exactly as
   `StartFormButton` redirects to `/form/[formId]` today.

### 9.3 `src/app/document/[id]/page.tsx` (new route, parallel to `form/[formId]`)

Structurally a copy of `src/app/form/[formId]/page.tsx`'s shell (header bar
with doc number, practice banner, Print/PDF + Pabeigt buttons, "done" screen)
with two swaps:

- Body: `DocumentRenderer` (§9.4) instead of `FormRenderer`.
- Print target: `DocumentPrintView` (§9.5) instead of `PrintView`.

The title in the header bar is `statement.template_name` (no `FORM_MAP`
lookup needed or possible, since `form_id` is `NULL` on this row).

### 9.4 `src/components/DocumentRenderer.tsx` (new)

```ts
export interface DocumentRendererProps {
  statementId: number;
  initialBodyHtml: string;
  readOnly?: boolean;
  onSaved?: (updated: Statement) => void;
}
```

Same autosave shape as `FormRenderer` (`dataRef`-equivalent holding the
current HTML string, debounced save on change, immediate save on blur) but
with exactly one field — the `RichTextEditor` — instead of a sections/rows
walk, and **no `TemplateBar`**, per the original requirement that this form
type has no in-session template-switching toolbar. Patient/doctor/visit-date
are shown above the editor as a read-only header (they were fixed at
creation in §9.2) rather than editable fields, since F001–F012's inline
patient fields don't apply here — the patient was already chosen.

### 9.5 `src/components/DocumentPrintView.tsx` (new)

Reuses `PrintView`'s header/footer chrome (practice block, title, doc
number, signature line, `Ārsts: {doctor_name}`) verbatim — that part has no
dependency on `FormDef`. The body section that `PrintView` builds from
`formDef.sections` is replaced with a single
`<div dangerouslySetInnerHTML={{ __html: statement.body_html }} />`
inside the same `print-page` wrapper, single-column (joins the
`SINGLE_COLUMN_FORMS` idea conceptually, but documents are single-column
unconditionally — there's no second form shape to weigh against).

`body_html` is re-sanitized at render time (not just at save time) using the
same §6.4 allow-list, so a template seeded before a future sanitizer change
can't carry anything the current allow-list wouldn't permit.

### 9.6 `src/app/midwife/page.tsx` — two small branches

- The "Veidlapa" column: `form?.title` falls back to `s.template_name` when
  `s.template_id` is set (today it falls back to the raw `s.form_id`).
- The hidden print target: branches `PrintView` vs. `DocumentPrintView` on
  `printTarget.template_id`.

No other change — the table, the 15s poll, and the date navigation are
already generic over `Statement` and need nothing form-shape-specific.

---

## 10. `db-init` and migrations

`src/app/api/db-init/route.ts` gains, after the existing `CREATE TABLE`
statements: `doc_templates`, `patients`, then the four `ALTER TABLE
statements ADD COLUMN IF NOT EXISTS …` / `DROP NOT NULL` statements from
§4.3, plus `CREATE INDEX IF NOT EXISTS idx_patients_name`. Running `POST
/api/db-init` against an existing database is additive only, matching how
`form_templates` was introduced — no separate migration tool, one more call.

No seed insert for `doc_templates` belongs in `db-init` the way the three
default doctors are seeded there — the six templates in §12 are real
clinical text that should be reviewed and pasted in through the new admin UI
once it exists, not silently inserted by an infra endpoint. A one-off
`dev/seed-doc-templates.ts` script (same spirit as `dev/templates.check.js`)
can carry the §12 content for convenience, run manually once.

---

## 11. Edge cases

| Case | Behaviour |
|------|-----------|
| Template archived after a document was started from it | Document unaffected (`body_html` already copied); template disappears from the `/doctor` picker only. |
| Template deleted (not archived) while documents reference it | `template_id` → `NULL` via `ON DELETE SET NULL`; `template_name` snapshot still displays correctly everywhere. |
| Patient roster entry edited after a document references it (via `patient_id`) | Document's displayed name/birth year reflect the edit on next read (§4.3) — by design, not a bug. |
| Doctor pastes formatted text from Word/Outlook into the editor | Tiptap's paste handling only recognizes the extensions actually loaded (§7.1); anything else is dropped on paste, not merely hidden. |
| `body_html` sanitization strips something the editor itself produced | Should never happen if §6.4's allow-list and §7.1's extension list are kept in sync — treated as a bug, not an expected path, and worth a dev-time assertion similar to `dev/templates.check.js`. |
| Admin deletes a template with zero documents created from it | Plain `DELETE`, nothing references it, no special case. |
| Two staff create a patient with the same name at once | No uniqueness constraint on `patients.name` — duplicates are possible and acceptable; the picker's search surfaces both and staff choose the right one, same tolerance the practice already has for identically-named real patients. |
| Document statement printed before `Pabeigt` | Same as F001–F012 today — print is always available, completion is a separate, optional status flag. |

---

## 12. Seed data — six templates from the reference photos

Transcribed from the eight supplied photos (OCR'd from phone photos of
paper/printed reports; Latvian diacritics and exact wording should be
double-checked against the originals before these go live). Each entry
below is **name** (first bold/underlined line, per the stated naming rule)
and the section outline to type into the new `RichTextEditor` — not literal
final HTML, since the exact bold/line-break choices are an editing step for
whoever owns this clinically, not something to freeze into a spec.

1. **Vēdera dobuma orgānu ultrasonogrāfija** *(older/typewriter source,
   photo 1)* — Aknas / Žultspūslis / Aizkuņģa dziedzeris / Labā niere /
   Kreisā niere / Liesa / Urīnpūslis / Prostata, each a bold label + normal
   findings sentence, ending in a blank **Slēdziens:**.
2. **VAIROGDZIEDZERA ULTRASONOGRĀFIJA** *(older/typewriter source, photo 2)*
   — Lob.dxt./Lob.sin. measurement line, then Lokalizācija / Kontūras /
   Forma / Ehogenitāte / Struktūra / Mezgli / epitēlijķermenīšu un kakla
   limfmezglu piezīme, blank **Slēdziens:**. *The original has an inline
   "Vārds, uzvārds ___ Personas kods ___" line — drop this from the seeded
   body, since patient identity is now the structured header from §9.2/§9.4,
   not free text inside the document.*
3. **Vairogdziedzera US.** *(Ultra Express house style, synthesized from
   photos 3 + 8)* — one opening sentence (parasta lokalizācija, lielums),
   Labā daiva / Isthmus / Kreisā daiva as labels, a struktūra/ehogenitāte/
   vaskularizācija/mezgli findings paragraph, a kakla limfmezglu line, an
   epitēlijķermenīšu line, blank **Slēdziens:**.
4. **Vēdera dobuma US.** *(Ultra Express house style, synthesized from
   photos 4 + 5)* — AKNA / ŽULTSPŪSLIS / AIZKUŅĢA DZIEDZERIS / LIESA /
   NIERES / URĪNPŪSLIS, each a bold label + findings sentence, blank
   **SLĒDZIENS:**.
5. **Gūžu locītavu US.** *(Ultra Express house style, photo 6)* — opening
   sentence (abas gūžu locītavas centrētas…), Sin. alfa/beta grādi and Dxt.
   alfa/beta grādi as two blank-value lines, **SLĒDZIENS.** pre-filled
   "US atrade atbilst vecuma normai." as a starting point (editable, not
   locked).
6. **Neirosonoskopija.** *(Ultra Express house style, photo 7)* — opening
   sentence, VLA/VLP/VT/VQ/CM/F/Ventrikulārais indekss/Corpus collosum as
   blank-value lines, **SLĒDZIENS.** pre-filled "US atrade bez patoloģiskām
   izmaiņām." as a starting point.

All six carry no practice letterhead inside `body_html` — `DocumentPrintView`
already prints the `PRACTICE` header (§9.5), so baking "SIA Ultra Express…"
into the template body would duplicate it.

---

## 13. Acceptance criteria

1. `POST /api/db-init` against the current production schema succeeds and
   is a no-op on a second call (idempotent `IF NOT EXISTS`/`ADD COLUMN IF
   NOT EXISTS` throughout).
2. An admin can create a template, see it appear on `/doctor` for every
   doctor (practice-wide, no per-doctor assignment in v1 — see §14), and
   archiving it removes it from that list without touching any statement
   already created from it.
3. Starting a document requires a staged `patient_id` — "Izveidot" is
   disabled otherwise; creating a brand-new patient inline and immediately
   using them works in one flow without leaving the modal.
4. The created document's body is byte-for-byte the template's `body_html`
   at that instant; editing the template afterward does not change it.
5. Bold/italic/font-size apply to selected text only, survive a save/reload
   round trip, and print exactly as shown on screen.
6. `GET /api/statements?date=` returns documents and structured-form
   statements interleaved by `created_at`, as one list, no client-side merge.
7. The midwife's print button produces a correct printout for both a
   structured-form statement and a document statement from the same table
   row shape, branching only on `template_id`.
8. A `<script>` tag (or any tag/attribute outside §6.4's allow-list) pasted
   or typed into the admin editor is stripped before it reaches
   `doc_templates.body_html`, and again stripped if it somehow reached
   `statements.body_html`.
9. The 12h purge job deletes a document statement exactly like a structured
   one; `patients` and `doc_templates` row counts are unaffected by a purge
   run.

---

## 14. Deferred / explicitly out of scope for v1

- **Per-doctor template assignment** (mirroring `doctors.form_ids`) —
  templates are practice-wide in v1, same as F001–F012's own template bar.
  If doctors want their own curated subset, add a nullable join table later;
  nothing in §4 blocks it.
- **Patient roster editing/merge UI, delete, or dedup tooling** — v1 is
  search + create only (§6.3); correcting a typo means a `PUT` this spec
  doesn't build a screen for yet.
- **Template icons** chosen by admin (tiles use a flat 📝 in v1, unlike
  F001–F012's per-form emoji).
- **Section-level or snippet-level rich text** (e.g. a canned-phrase picker
  inside the editor) — the editor is whole-document free text only, matching
  the original ask ("large screen text area doctor can fill as he wish").
- Confirming the §3.1 privacy/compliance question before building §4.2.
