# Feature: Form Templates (Veidlapu veidnes)

**Status:** implemented on `feature/templating` — see §12 for what changed during build
**Applies to:** all forms F001–F010, via `FormRenderer`
**Author:** design session 2026-09-19

---

## 1. Business context

A doctor fills the same ultrasound form dozens of times a day, and most reports
are near-identical: a "normal findings" protocol with three or four measurements
changed. Today every field is typed from scratch. Typing on a tablet between
patients is the single slowest part of the visit.

Templating lets a doctor capture a filled form once and re-apply it with **one
tap**, leaving only the patient-specific deltas to type.

The design constraint that drives everything below: **minimise keyboard and tap
count**. Any dialog, confirmation or naming step that stands between the doctor
and the filled form is a cost, and is only accepted where the alternative is
data loss.

---

## 2. Functional requirements

| # | Requirement | Priority |
|---|-------------|----------|
| FR-1 | Doctor can save the current form's data as a new template with one tap. | Must |
| FR-2 | Templates are auto-named `T01`…`T12`; no typing required to save one. | Must |
| FR-3 | A template may carry an optional short label (≤ 24 chars) shown on the button. | Should |
| FR-4 | Doctor can apply a template with one tap; it replaces all fields the template covers. | Must |
| FR-5 | An applied template can be undone for 10 s without a confirmation dialog. | Must |
| FR-6 | Doctor can delete the currently-applied template from the bar; undoable for 10 s. | Must |
| FR-7 | Doctor can overwrite or rename an existing slot via long-press on its button. | Should |
| FR-8 | Templates are shared practice-wide, scoped per `form_id`. | Must |
| FR-9 | Templates never contain patient-identifying data. | Must |
| FR-10 | The bar is a single component reused by every form, with no per-form code. | Must |
| FR-11 | Templates are permanent — the 12-hour statement purge must not touch them. | Must |

---

## 3. Chosen design and rejected alternatives

**Chosen: a horizontal template bar, rendered inside `FormRenderer`.**

`FormRenderer` already owns the canonical form state (`dataRef`) and the save
pipeline. Putting the bar inside it means:

- every form gets the feature with zero per-form wiring (FR-10);
- apply reuses the existing debounce/save/`onSaved` path, so no second
  persistence mechanism is introduced;
- the bar cannot drift out of sync with the fields, because there is one source
  of truth.

The bar is *not* placed in `src/app/form/[formId]/page.tsx`. That page would have
to lift form state out of `FormRenderer` to feed the bar — a refactor that buys
nothing and creates two writers to the same statement.

Alternatives considered and rejected:

| Alternative | Why rejected |
|-------------|--------------|
| **Clone the previous statement** ("repeat last") | Statements are purged after 12 h, so the source disappears overnight; and a clone would carry the previous patient's name and birth year — a GDPR incident waiting to happen. |
| **Field-level snippets** (per-textarea macro list) | More taps, not fewer: the doctor picks a snippet per field. Useful later for the long conclusion fields; not a replacement for whole-form templates. |
| **`localStorage`-only templates** | Templates were chosen to be practice-shared; browser storage is per-device and per-browser, and the practice uses several tablets. Also lost on cache clear. |
| **Section-level apply** (apply a template to one section only) | Real value, but doubles the interaction model (pick template *and* pick section). Deferred to v2 — the data model below already supports it without migration. |
| **Confirmation dialog before apply** | A dialog that appears on every apply is a dialog the doctor stops reading within a week. Replaced by the undo toast (§6.3), which costs zero taps in the normal case. |

---

## 4. Data model

New permanent table. Added to `src/app/api/db-init/route.ts` as
`CREATE TABLE IF NOT EXISTS`, so existing deployments only need one more
`POST /api/db-init` — no separate migration tooling.

```sql
CREATE TABLE IF NOT EXISTS form_templates (
  id          SERIAL       PRIMARY KEY,
  form_id     VARCHAR(5)   NOT NULL,              -- F001..F010
  slot        SMALLINT     NOT NULL,              -- 1..12, rendered as T01..T12
  label       VARCHAR(24),                        -- optional, e.g. 'Norma'
  form_data   JSONB        NOT NULL DEFAULT '{}',
  created_by  INTEGER      REFERENCES doctors(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT form_templates_slot_range CHECK (slot BETWEEN 1 AND 12),
  CONSTRAINT form_templates_form_slot_uniq UNIQUE (form_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_form_templates_form
  ON form_templates (form_id, slot);
```

Notes:

- **`UNIQUE (form_id, slot)`** is the concurrency control. Two doctors saving a
  template for F001 at the same instant cannot both take slot 4 — one insert
  fails and is retried against the next free slot (§5.2).
- **`created_by`** is for audit only ("who introduced this phrasing"), not for
  filtering. Scope is practice-wide by decision; `ON DELETE SET NULL` keeps a
  template alive when a doctor row is removed.
- **No `doctor_id` scoping column.** If per-doctor templates are ever wanted,
  add a nullable `owner_id` and widen the unique constraint to
  `(form_id, COALESCE(owner_id, 0), slot)`; nothing else in this design changes.
- `slot` is capped at 12 by a CHECK rather than by application code alone.
  Twelve buttons is roughly what fits on one tablet row without scrolling; past
  that the bar stops being faster than typing.

### 4.1 What goes into `form_data`

Stored: every field id in the form definition whose `type` is **not**
`calculated` and which is **not** one of the common patient fields.

Excluded, unconditionally and server-side:

```
any field with common === true                 -- PII / per-visit
  (today: patient_name, patient_birth_year, visit_date)
any field with sensitive === true              -- identifier, not a column
  (today: personas_kods on F005)
any field with type === 'calculated'           -- derived, never authored
any key absent from FORM_MAP[form_id]          -- drift / bad client
```

The exclusion is driven by flags already carried by the field definitions, not
by a hardcoded id list — so a fourth common field added later is excluded
automatically.

`common` and `sensitive` are deliberately separate. `common` means "stored as a
top-level column on `statements`", which drives the save split as well; marking
`personas_kods` common would route it to a column that does not exist and the
value would never be saved at all. `sensitive` means only "patient-identifying,
so never into a permanent row" — it saves normally inside `form_data` and is
purged with the statement after 12 h. Applying a template therefore also never
clears an identifier the doctor has already typed. Note that `FormRenderer` currently duplicates this
knowledge in a local `COMMON_FIELDS` set; `src/lib/templates.ts` should export
the single predicate and `FormRenderer` should use it, retiring the set.

Empty values **are** stored (as `''`). This is deliberate: it makes apply a
true *replace* rather than a merge, so switching from `T02` back to `T01` clears
the fields `T02` had set. A template that only stored non-empty values would
leave residue from the previously applied one.

### 4.2 PII, and why the exclusion is server-side

`statements` rows are purged after 12 hours; `form_templates` rows live
forever. A template is therefore the one place in this application where free
text can outlive the retention window. The strip in §5.1 runs in the API route,
not only in the browser, so a bad client cannot persist a patient name.

This does not cover a doctor typing a patient's name into a *free-text finding*
field and saving that as a template. Mitigations:

- the save toast reports the field count, and long-press → **Apskatīt** opens a
  read-only dump of what the slot holds, so a bad template is visible and
  deletable;
- templates are practice-shared and few (≤ 12 per form), so they are reviewable
  in practice, unlike per-visit data.

---

## 5. API contract

New routes under `src/app/api/templates/`. All use `getDb()` from
`src/lib/db.ts` and `export const dynamic = 'force-dynamic'`, matching the
existing routes.

### 5.1 `GET /api/templates?form_id=F001`

Returns the full bar payload, `form_data` included, ordered by `slot`:

```jsonc
[
  { "id": 7, "form_id": "F001", "slot": 1, "code": "T01", "label": "Norma",
    "form_data": { "uterus_position": "Antefleksijā", "…": "…" },
    "created_by": 3, "updated_at": "2026-09-19T08:12:04Z" }
]
```

`form_data` ships with the list on purpose: ≤ 12 templates × a few KB is a
smaller payload than the form definition itself, and it makes **apply a purely
local operation with zero latency** — which is the entire point of the feature.
`code` is computed server-side (`'T' + slot.padStart(2,'0')`) so the display
name has one definition.

400 if `form_id` is missing or not in `FORM_MAP`.

### 5.2 `POST /api/templates`

Body: `{ form_id, form_data, label?, created_by? }`.
The server allocates the **lowest free slot** atomically:

```sql
WITH free AS (
  SELECT gs AS slot
  FROM generate_series(1, 12) gs
  WHERE NOT EXISTS (
    SELECT 1 FROM form_templates t
    WHERE t.form_id = ${form_id} AND t.slot = gs
  )
  ORDER BY gs
  LIMIT 1
)
INSERT INTO form_templates (form_id, slot, label, form_data, created_by)
SELECT ${form_id}, free.slot, ${label}, ${formDataJson}::jsonb, ${createdBy}
FROM free
RETURNING id, form_id, slot, label, form_data, created_by, updated_at::text
```

- Single statement — required, because the Neon serverless HTTP driver used here
  executes one statement per round trip and gives no implicit transaction across
  calls. Read-then-insert in two calls would race.
- Zero rows returned ⇒ all 12 slots taken ⇒ **409** with
  `{ error: 'SLOTS_FULL' }`; the client shows *"Visas 12 vietas aizņemtas —
  nodzēsiet kādu veidni."*
- Unique-violation (`23505`) ⇒ another doctor took the slot in the same
  millisecond ⇒ **retry the same statement, max 3 attempts**, then 409.
- `form_data` is sanitised here: drop the three common fields and every
  `calculated` field id resolved from `FORM_MAP[form_id]`; drop any key not in
  the form definition at all.

Returns 201.

### 5.3 `PUT /api/templates/[id]`

Body: `{ form_data?, label? }` — used by long-press → *Pārrakstīt* and
*Pārdēvēt*. Same sanitisation as POST. `slot` is immutable: a doctor who
remembers "T03 is the twin-pregnancy one" must keep that true, so overwriting
content never renumbers.

**Last write wins.** With practice-wide scope and ≤ 12 slots, optimistic
locking would surface a conflict screen far more often than it would prevent a
real loss; `updated_at` is returned so the UI can show *"atjaunots 14:05"*.

404 if the id does not exist.

### 5.4 `DELETE /api/templates/[id]`

Deletes the row and returns the deleted payload (`200`), so the client can hold
it in memory for undo:

```jsonc
{ "deleted": { "form_id": "F001", "slot": 3, "label": "Dvīņi", "form_data": {…} } }
```

Undo re-POSTs that payload. If the freed slot was claimed by another doctor in
the meantime, the re-POST lands on the next free slot and the toast says
*"Atjaunots kā T05"*. No reservation, no tombstone table — the window is 10 s
and the collision is cosmetic.

---

## 6. UI / interaction

### 6.1 Placement and layout

The bar is rendered by `FormRenderer` above the save indicator, sticky beneath
the existing page header:

```
┌──────────────────────────────────────────────────────────┐
│ ← Atpakaļ  🩺 TV/TA Ultrasonoskopija   Nr. 000123  [🖨][✓]│  sticky top-0  z-10
├──────────────────────────────────────────────────────────┤
│ [💾 Saglabāt] [🗑 Dzēst] │ [T01 Norma] [T02] [T03 Dvīņi]  │  sticky top-[57px] z-[9]
├──────────────────────────────────────────────────────────┤
│                                          ✓ Saglabāts      │
│  Vārds, uzvārds  [___________________]                    │
```

- Horizontally scrollable (`overflow-x-auto`, momentum scroll) when the slots
  outgrow the width; the two action buttons are pinned left and do not scroll
  away.
- Touch targets ≥ 44 × 44 px. Slot buttons: `T0n` on the first line, label in
  smaller muted type on the second; unlabelled slots render `T0n` centred.
- Sticky so a template can be re-applied from the middle of a long form without
  scrolling back to the top.

### 6.2 States

| Control | Enabled when | Notes |
|---------|--------------|-------|
| **💾 Saglabāt** | always, unless all 12 slots are taken | disabled + tooltip when full |
| **🗑 Dzēst** | `activeTemplateId !== null` | i.e. a template was applied on this screen, per requirement |
| **T0n** | always | applied slot gets a blue ring; a `•` marker appears once any field is edited after the apply |

`activeTemplateId` is component state, reset only by applying a different
template or by leaving the page. Editing fields marks the slot *modified* but
does **not** clear it — otherwise Delete would become unreachable the moment the
doctor starts typing, which is exactly when they realise the template is wrong.

The whole bar is hidden when `readOnly` is true or `statement.is_complete` is
true. A completed report is a document, not a draft.

### 6.3 Apply — the undo toast

1. Tap `T02`.
2. `FormRenderer` snapshots `dataRef.current` into `undoRef`.
3. For every key in the template, set the value; keys absent from the template
   are left untouched (§7 field drift). Patient fields are never written.
4. `setData` + `saveNow()` — one PUT, same path as any field edit.
5. Toast, bottom-centre, 10 s: **`T02 pielietots · Atsaukt`**.
6. Tapping *Atsaukt* restores `undoRef` and saves again. Undo depth is 1; a
   second apply within the window replaces the snapshot.

No confirmation dialog anywhere in this flow. The toast is the confirmation,
and it costs nothing when the doctor does the thing they meant to do.

### 6.4 Save — one tap, keyboard optional

1. Tap **💾 Saglabāt**.
2. POST with the sanitised snapshot; the new button appears at the end of the
   bar with a brief highlight.
3. Toast: **`T04 saglabāts (37 lauki) · Nosaukums`**. The *Nosaukums* action
   opens a small inline input for the optional label; ignoring it is fine and
   is the expected path.

The label is never a required step — that is what keeps FR-1 to a single tap.

### 6.5 Long-press (500 ms) or right-click on a slot

Opens an action sheet:

- **Pārrakstīt** — PUT current form data into that slot (undo toast, 10 s)
- **Pārdēvēt** — inline label input
- **Apskatīt** — read-only list of stored `label: value` pairs
- **Dzēst** — same path as the bar's delete button

This keeps overwrite and rename off the bar, where every extra button costs
width that slot buttons need.

### 6.6 Latvian UI strings

| Key | LV |
|-----|-----|
| save | `💾 Saglabāt` |
| delete | `🗑 Dzēst` |
| applied | `{code} pielietots` |
| undo | `Atsaukt` |
| saved | `{code} saglabāts ({n} lauki)` |
| name it | `Nosaukums` |
| deleted | `{code} dzēsts` |
| restored as | `Atjaunots kā {code}` |
| slots full | `Visas 12 vietas aizņemtas — nodzēsiet kādu veidni.` |
| overwrite | `Pārrakstīt` |
| rename | `Pārdēvēt` |
| inspect | `Apskatīt` |

---

## 7. Component contract

```ts
// src/components/TemplateBar.tsx
export interface TemplateBarHandle {
  /** Called on every edit; only the first one after an apply costs a render. */
  markDirty: () => void;
}

export interface TemplateBarProps {
  formId: string;
  doctorId?: number | null;
  /** Pull-based snapshot — called only on tap, never on render. */
  getCurrentData: () => Record<string, unknown>;
  /** Hands the values up to FormRenderer, which returns the undo closure. */
  onApply: (values: Record<string, unknown>) => (() => void) | void;
  ref?: Ref<TemplateBarHandle>;
}
```

`getCurrentData` is a **getter, not a `data` prop**. Passing the form data down
would re-render the bar on every keystroke — 12 buttons and a scroll container
re-rendered per character on a tablet. The bar only needs the data at the
instant Save or Overwrite is tapped, and `FormRenderer.dataRef` already holds
it synchronously.

`onApply` hands values *up* rather than the bar writing state directly, so
`FormRenderer` stays the only writer to `dataRef` and the only caller of
`save()`. It **returns the undo closure**, which the bar wires to the toast's
*Atsaukt* — the snapshot belongs to whoever owns the state, and that is
`FormRenderer`.

The `•` modified marker needs an edit signal, which would re-introduce the
per-keystroke re-render the getter exists to avoid. So the signal goes through
the ref instead: `FormRenderer` calls `markDirty()` on every change, and the
bar's internal ref guard returns immediately unless this is the *first* edit
after an apply. One render per apply, not one per character.

New types in `src/lib/types.ts`:

```ts
export interface FormTemplate {
  id: number;
  form_id: string;
  slot: number;
  code: string;                       // 'T01'
  label: string | null;
  form_data: Record<string, unknown>;
  created_by: number | null;
  updated_at: string;
}
```

`FormRenderer` gains two optional props, both defaulting to on:

```ts
templatesEnabled?: boolean;   // default: !readOnly
doctorId?: number | null;     // forwarded to created_by
```

`PrintView` is untouched — it does not use `FormRenderer`.

---

## 8. Edge cases

| Case | Behaviour |
|------|-----------|
| **Form definition changed after a template was saved** | Keys absent from the current definition are dropped on load; fields added since are left untouched by apply. No template invalidation, no version column. |
| **Template applied to a form with data** | Full replace of covered fields + 10 s undo. |
| **Apply while a debounced field save is pending** | `onApply` calls `saveNow()`, which clears the pending debounce first — same guard the existing blur path uses. |
| **Save PUT fails after apply** | The existing `⚠ Kļūda saglabājot` indicator covers it; the applied values stay on screen and the next edit retries. |
| **Two doctors save simultaneously** | Unique constraint + retry (§5.2). Worst case one gets `T05` instead of `T04`. |
| **Doctor deletes a slot another doctor has applied on their screen** | The other screen keeps its values; its Delete button 404s once and the bar refetches. Practice-wide scope accepted this. |
| **All 12 slots full** | Save disabled with tooltip; delete first. |
| **`is_complete` statement reopened** | Bar hidden while complete. |
| **Template contains a key with `undefined`** | Sanitiser coerces to `''`; JSONB never stores `undefined`. |
| **Purge job** | `purge-statements` touches `statements` only — verified; README's retention section gains a line stating templates are permanent. |

---

## 9. Acceptance criteria

1. Saving a template from a filled F001 takes **exactly one tap** and produces a
   new `T0n` button within 500 ms.
2. Applying a template updates every covered field on screen in **< 100 ms**
   (local, no fetch) and persists within the normal save cycle.
3. `patient_name`, `patient_birth_year`, `visit_date` are absent from every
   `form_templates.form_data` row — assert directly against the DB after saving
   a template from a form filled with all three.
4. `POST /api/templates` called 12× for one form succeeds 12 times with slots
   1–12; the 13th returns 409 `SLOTS_FULL`.
5. Two concurrent POSTs for the same form never produce duplicate slots
   (unique constraint holds; both requests succeed with distinct slots).
6. *Atsaukt* within 10 s restores the exact pre-apply snapshot, including
   fields the template cleared.
7. Delete is disabled until a template is applied, and enabled afterwards even
   once fields have been edited.
8. The bar appears on all ten forms with no per-form code beyond `FORM_MAP`.
9. `POST /api/db-init` on an existing database creates `form_templates` without
   touching `doctors` or `statements`.
10. Running the purge endpoint leaves `form_templates` row count unchanged.

---

## 10. Implementation plan

| # | File | Change |
|---|------|--------|
| 1 | `src/app/api/db-init/route.ts` | `CREATE TABLE IF NOT EXISTS form_templates` + index |
| 2 | `src/lib/types.ts` | `FormTemplate` interface |
| 3 | `src/lib/templates.ts` *(new)* | `sanitizeTemplateData(formId, data)`, `slotCode(slot)`, `MAX_TEMPLATE_SLOTS = 12` — shared by routes and client |
| 4 | `src/app/api/templates/route.ts` *(new)* | `GET` (list by form_id), `POST` (allocate slot, retry on 23505) |
| 5 | `src/app/api/templates/[id]/route.ts` *(new)* | `PUT`, `DELETE` |
| 6 | `src/components/TemplateBar.tsx` *(new)* | bar, long-press sheet, label input, slots-full state |
| 7 | `src/components/Toast.tsx` *(new)* | small toast with one action + auto-dismiss, reused by apply/save/delete |
| 8 | `src/components/FormRenderer.tsx` | render `TemplateBar`; add `applyTemplate()` + `undoRef`; new props |
| 9 | `src/app/form/[formId]/page.tsx` | pass `doctorId={statement.doctor_id}` |
| 10 | `dev/templates.check.js` *(new)* + `test:templates` npm script | dependency-free assertions over all ten forms: no patient field, no calculated field and no unknown key can reach a template row; empty-value coverage; round trip |
| 11 | `README.md` | Templates section, schema, retention note |

Order: 1–3 (foundation) → 4–5 (API, testable with `curl`) → 7 → 6 → 8–9 →
10. Steps 4–5 are independently verifiable before any UI exists.

**Framework note.** This project runs Next `16.2.9`, and per `AGENTS.md` the
conventions differ from older App Router releases — check
`node_modules/next/dist/docs/` before writing the routes. Concretely, dynamic
route handlers take `{ params }: { params: Promise<{ id: string }> }` and must
`await params`, exactly as `src/app/api/statements/[id]/route.ts` already does;
the new `templates/[id]` route follows that file verbatim.

---

## 11. Deferred to v2

- **Section-level apply** — the bar gains a mode where a template fills only one
  `FormSection`. Needs no schema change; `form_data` already carries field ids
  that map to sections through `FORM_MAP`.
- **Per-doctor templates alongside shared ones** — nullable `owner_id`, widened
  unique constraint (§4).
- **Snippet fields** — a per-textarea phrase list for the long conclusion
  fields, which whole-form templates serve only coarsely.
- **Usage counters** — `applied_count` to sort the bar by what is actually used,
  and to retire dead slots.

---

## 12. Changes made during implementation

Everything in §1–§11 was built as specified. Four things were decided at the
keyboard and are recorded here so the spec matches the branch:

1. **`onApply` returns the undo closure** rather than the bar owning the
   snapshot (§7). Undo has to restore `dataRef`, and `FormRenderer` owns it.
2. **The `•` modified marker is signalled through the ref**
   (`TemplateBarHandle.markDirty`), not through a prop. A prop would re-render
   the bar on every keystroke, defeating the `getCurrentData` getter.
3. **`dev/templates.check.js` + `npm run test:templates`** were added. The
   repo has no test runner, so the check compiles `src/lib/templates.ts` with
   `tsc` and asserts with `node:assert` — no new dependency. It locks
   acceptance criterion 3 (no patient data in a permanent row) across all ten
   forms: 64 checks.
4. **`TemplateBar` does not call `setLoading(true)` in its load effect** —
   `loading` starts `true` instead. Next 16's `react-hooks/set-state-in-effect`
   rule rejects synchronous state writes in an effect body, and a mounted form
   page never changes `formId`.

Verified on the branch: `tsc --noEmit` clean, `next build` clean (both
`/api/templates` routes registered), `eslint` clean on every new file, and
`npm run test:templates` green. The three pre-existing lint errors in
`admin/page.tsx`, `midwife/page.tsx` and `FormRenderer.tsx` are unchanged —
none of them are new.

Not verified: nothing has been run against a live database. `POST /api/db-init`
still needs to be called once per environment, and the slot-allocation SQL,
the 409 `SLOTS_FULL` path and the concurrent-save case are untested against
real Postgres.
