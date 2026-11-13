# abprakse-sono-forms — Webapp

Ultrasonoskopijas veidlapu sistēma. L. Berģītes ārsta prakse, Rīga.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Neon PostgreSQL.

## Setup

### 1. Environment

Copy the example env file and fill in your Neon connection string:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

Get a free connection string from [neon.tech](https://neon.tech).

### 2. Install dependencies

```bash
npm install
```

### 3. Initialize the database

Start the dev server first, then hit the init endpoint once:

```bash
curl -X POST http://localhost:3000/api/db-init
```

Or visit `/admin` in the browser and click **Inicializēt DB**. This creates the `doctors` and `statements` tables and seeds 3 default doctors.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| URL | Who uses it | Purpose |
|-----|-------------|---------|
| `/` | Everyone | Home — choose Doctor or Midwife |
| `/doctor` | Doctor | Select doctor → select form → fill it |
| `/form/[formId]?id=X` | Doctor | Fill ultrasound form (auto-saves on every field) |
| `/midwife` | Midwife | View today's statements, date navigation, print |
| `/admin` | Admin | Add/edit doctors, assign forms, set avatars |
| `/admin/templates` | Admin | Create/edit/archive rich-text document templates |
| `/document/[id]` | Doctor | Fill a rich-text document (auto-saves) |

## Forms

| ID | Title |
|----|-------|
| F001 | TV/TA Ultrasonoskopija (Gynecology) |
| F002 | Ultrasonoskopija — Gūžu locītavas (Hip joints) |
| F003 | Ultrasonoskopija — Smadzeņu (Brain neurosonography) |
| F004 | TV/TA Ultrasonoskopija — Grūtniecība I trimetris |
| F005 | Augļa Ehokardigrāfija (Fetal echocardiography) |
| F006 | Ultrasonoskopija — Vēdera dobums (Abdominal) |
| F007 | Augļa Ultrasongrāfija III Trimestris (version A) |
| F008 | Augļa Ultrasongrāfija III Trimestris (version B) |
| F009 | Ultrasongrāfija 20+0–21+6 gr.nedēļās (Mid-trimester) |
| F010 | I trimestra skrīninga protokols — FMF 11+0–13+6 (First trimester screening) |
| F011 | Krūšu sonogrāfija (Breast ultrasound) |

Form schemas live in `src/lib/form-definitions.ts`.

## Templates (veidnes)

Most reports are a "normal findings" protocol with a few measurements changed,
so any form can be saved as a reusable template and re-applied with one tap.

A template bar sits under the form header on every form: **💾 Saglabāt**,
**🗑 Dzēst**, then the saved slots `T01`…`T12`. Tapping a slot replaces every
field it covers and offers **Atsaukt** for 10 seconds — there is no confirmation
dialog anywhere in the flow. Long-press (or right-click) a slot to overwrite it
with the current form data, rename it, inspect what it holds, or delete it.

Templates are **shared practice-wide and scoped per form** — `T01` on F001 is
the same template for every doctor. There are at most 12 slots per form; the
server allocates the lowest free one, so saving never requires typing.

**Templates never contain patient data.** `patient_name`,
`patient_birth_year`, `visit_date`, every field flagged `sensitive` in the form
definitions (currently `personas_kods` on F005) and all calculated fields are
stripped server-side in `src/lib/templates.ts` before anything is written,
because template rows are permanent while statement rows are purged after 12
hours. A patient identifier that is not a top-level column gets
`sensitive: true` on its field definition — that is the whole mechanism.
That guarantee is covered by a check across all ten forms:

```bash
npm run test:templates
```

Design notes, API contract and edge cases: `specs/feature-templates.md`.

## Document templates (brīvā teksta dokumenti)

A second, parallel form type for reports that are prose rather than
measurements (e.g. abdomen/thyroid/hip/neuro ultrasound reports). An admin
authors named templates with a rich-text body at `/admin/templates` — bold,
italic, four font sizes, nothing else. No code change or deploy is needed to
add a new document type.

Each template has a stable id — `T001`, `T002`, … — alongside F001–F012, and
is only visible to a doctor it's explicitly assigned to: the admin
doctor-edit screen (`/admin`) has a second toggle grid for document
templates, right under the form grid, writing into the same `form_ids`
array. A new template isn't assigned to anyone by default, same as a new
structured form. On `/doctor`, each template assigned to the selected doctor
appears as its own tile (📝) alongside the structured forms. Starting one
opens a patient search/create step — the
practice's **persistent patient roster** (`patients` table, not purged) —
then copies the template's current body into a new, independently-editable
document at `/document/[id]`. Editing, autosave, print/PDF and the midwife's
daily list all work exactly like the structured forms; a document is simply
a `statements` row with `template_id`/`body_html` set instead of
`form_id`/`form_data`.

**Unlike every other table in this app, the patient roster is not purged.**
Patient identity (name, birth year, optionally a personal code) has to
survive beyond 12 hours for "choose an existing patient" to mean anything —
a deliberate, scoped exception to this app's purge-everything privacy model.
See `specs/feature-document-templates.md` §3.1 for the reasoning and the
compliance caveat.

Design notes, data model, API contract and the six seed templates:
`specs/feature-document-templates.md`. Seed them with
`npm run seed:doc-templates` against a running dev server.

## Database schema

```sql
-- Doctors
CREATE TABLE doctors (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  title       VARCHAR(100) NOT NULL DEFAULT 'Ārsts', -- printed before the name, e.g. 'Pediatrs'
  avatar      VARCHAR(10)  NOT NULL DEFAULT '👤',
  form_ids    TEXT[]       NOT NULL DEFAULT '{}',
  active      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Statements (one row per patient visit/form)
CREATE TABLE statements (
  id                 SERIAL PRIMARY KEY,
  doc_id             VARCHAR(6)   NOT NULL UNIQUE,  -- zero-padded: 000001
  form_id            VARCHAR(5)   NOT NULL,           -- F001..F009
  visit_date         DATE         NOT NULL DEFAULT CURRENT_DATE,
  doctor_id          INTEGER      REFERENCES doctors(id),
  patient_name       VARCHAR(255),
  patient_birth_year INTEGER,
  form_data          JSONB        NOT NULL DEFAULT '{}',
  is_complete        BOOLEAN      NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Form templates (reusable prefilled protocols, shared practice-wide)
CREATE TABLE form_templates (
  id          SERIAL PRIMARY KEY,
  form_id     VARCHAR(5)   NOT NULL,           -- F001..F010
  slot        SMALLINT     NOT NULL,           -- 1..12, shown as T01..T12
  label       VARCHAR(24),                     -- optional, e.g. 'Norma'
  form_data   JSONB        NOT NULL DEFAULT '{}',
  created_by  INTEGER      REFERENCES doctors(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT form_templates_slot_range CHECK (slot BETWEEN 1 AND 12),
  CONSTRAINT form_templates_form_slot_uniq UNIQUE (form_id, slot)
);

-- Rich-text document templates (admin-authored, see "Document templates" above)
CREATE TABLE doc_templates (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  body_html   TEXT         NOT NULL DEFAULT '',
  active      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- The document feature's own patient roster — NOT purged, unlike everything else
CREATE TABLE patients (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  birth_year     INTEGER,
  personal_code  VARCHAR(32),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- `statements` additionally carries (nullable, unused by structured forms):
--   template_id    INTEGER REFERENCES doc_templates(id) ON DELETE SET NULL
--   template_name  VARCHAR(100)  -- snapshot of doc_templates.name at creation
--   body_html      TEXT          -- the document's editable rich-text body
--   patient_id     INTEGER REFERENCES patients(id) ON DELETE SET NULL
-- form_id is nullable for the same reason: a document row leaves it NULL.
```

Common fields (`patient_name`, `patient_birth_year`, `visit_date`) are top-level columns. All other form-specific fields are stored in `form_data` JSONB.

`UNIQUE (form_id, slot)` is the concurrency control for template slots: two
doctors saving at the same instant cannot take the same slot — one insert
fails and is retried against the next free one.

## Data retention

> **Scheduled purge is currently disabled (since 2026-11-12).** The hourly
> trigger in `.github/workflows/purge-statements.yml` is switched off, so
> `statements` rows are kept until someone removes them by hand — the purge
> endpoint and the workflow's manual "Run workflow" button both still work.
> The rest of this section describes the purge as it behaves when the
> schedule is on; restore the `schedule:` block in the workflow to re-enable.

Form data (the `statements` table — patient visits and their `form_data`,
and now also rich-text documents' `body_html`) is temporary: any row older
than **12 hours** (by `created_at`) is deleted automatically. Everything else
(`doctors`, `form_templates`, `doc_templates`, form definitions, etc.) is
permanent and is never touched by this job — **including `patients`**, which
is the one deliberate, scoped exception to "patient data doesn't outlive a
visit" (see **Document templates** above).

Because `form_templates` rows are permanent, they are the one place where text
entered on a form can outlive the retention window — which is why the template
sanitiser strips patient fields server-side (see **Templates** above).

The purge itself lives at `POST /api/cron/purge-statements`
(`src/app/api/cron/purge-statements/route.ts`). It's guarded by a
`CRON_SECRET`: set it as an environment variable on the Vercel project
(Settings → Environment Variables) and the route only accepts calls whose
`Authorization` header is `Bearer <CRON_SECRET>`. If it's left unset, the
route allows unauthenticated calls on a local dev server only (so it's easy to
test); in production an unset secret means every call is refused. This is the
one data route that is reachable without a login session — see **Access
protection** below.

**Scheduling:** Vercel's Hobby (free) plan only allows *daily* Cron Jobs, so
an hourly schedule can't be defined via `vercel.json` without upgrading to
Pro. Instead, `.github/workflows/purge-statements.yml` runs the schedule
for free on GitHub Actions — hourly, calling the endpoint above.

One-time setup:

1. Generate a secret: `openssl rand -hex 32`.
2. Add it as `CRON_SECRET` in the Vercel project's environment variables,
   then redeploy.
3. Add the *same* value as a repository secret named `CRON_SECRET` in
   GitHub: repo → Settings → Secrets and variables → Actions → New
   repository secret.
4. Push the workflow file to the default branch — GitHub then runs it
   hourly on its own; no Vercel plan change needed. It can also be run
   on demand from the repo's Actions tab ("Run workflow").

To test the endpoint directly (bypassing the schedule):

```bash
curl -X POST http://localhost:3000/api/cron/purge-statements
# or, against production, with the secret:
curl -X POST -H "Authorization: Bearer <CRON_SECRET>" \
  https://abprakse-sono-forms.vercel.app/api/cron/purge-statements
```

If a paid Vercel plan becomes available later, this can move back to a
native Vercel Cron Job — just add a `vercel.json` with a `crons` entry
pointing at the same path and drop the GitHub Actions workflow.

## Access protection

The whole app sits behind a login: without a valid session nothing but
`/login` is reachable — no page and no `/api/*` route.

**How staff log in.** The login screen asks for a 6-digit code from an
authenticator app (Microsoft Authenticator, Google Authenticator, or any other
TOTP app). The practice shares **one** authenticator key; every phone or PC
that should be able to log in is enrolled with the same QR code. There are no
personal accounts and the app does not record who changed what — the login
only keeps outsiders out. A browser stays logged in for **12 hours**, then
asks for a code again. "Iziet" on the start page logs out.

**How it's enforced.**

- `src/proxy.ts` checks the session cookie before every page and API route.
- Every data route also calls `requireSession()` (`src/lib/auth/guard.ts`)
  itself, so the API stays closed even if the proxy were bypassed.
- The session is a signed cookie (`src/lib/auth/session.ts`): `HttpOnly`,
  `Secure`, `SameSite=Lax`, valid 12 h. It is stateless; changing
  `SESSION_SECRET` logs everyone out at once.
- Codes are standard TOTP (`src/lib/auth/totp.ts`: RFC 6238, SHA-1, 6 digits,
  30 s). The current and the previous code are accepted; a code that was
  already used is refused.
- **Attempt limit** (`src/lib/auth/attempts.ts`) — this is what makes a
  6-digit code safe to rely on: 5 wrong codes per address per 15 minutes, and
  10 wrong codes per hour overall. When the limit is hit the login screen says
  how long to wait. A burst of wrong codes from outside therefore blocks *new*
  logins for up to an hour; browsers already logged in keep working. If staff
  ever see "Pārāk daudz nepareizu mēģinājumu" without having mistyped, someone
  is guessing — that is the signal to consider adding a password as well.
- The one exception is `POST /api/cron/purge-statements`, which has no browser
  cookie and is protected by `CRON_SECRET` instead.

**Environment variables**

| Variable | What it is |
|---|---|
| `TOTP_SECRET` | The authenticator key (base32). Anyone who has it can log in. |
| `SESSION_SECRET` | Random key that signs the session cookie (64 hex chars). |

In production **both must be set** — if either is missing the site answers
`503` for everyone rather than running unprotected. On a local dev server with
both left empty there is no login.

**First-time setup** (order matters — deploying before step 3 locks the site):

1. Run `node dev/auth-setup.js` in your own terminal. It prints a QR code and
   the two variables. Nothing is saved or sent anywhere.
2. Scan the QR code with the authenticator app on every phone that should be
   able to log in. Store `TOTP_SECRET` somewhere safe (a password manager).
3. Add `TOTP_SECRET` and `SESSION_SECRET` to the Vercel project (Settings →
   Environment Variables → Production). Check `CRON_SECRET` is set there too.
4. Deploy. The two database tables the attempt limit uses are created
   automatically on the first login.

**Later**

- *Enrol another phone:* `TOTP_SECRET=<the key> node dev/auth-setup.js --show`
  prints the QR code again.
- *A phone is lost, or someone leaves:* run `node dev/auth-setup.js` again,
  replace both variables in Vercel, redeploy, and re-scan on the remaining
  phones. The old key stops working immediately.
- *Log everyone out now:* change `SESSION_SECRET` and redeploy.

`npm run test:auth` checks the code generator against the RFC 6238 test
vectors and the session cookie against tampering and expiry.

## Deploy

Deploy to [Vercel](https://vercel.com) and set `DATABASE_URL` as an environment variable in the project settings. Neon works with Vercel out of the box.


No Vercel CLI and no existing project config. Here's the plan:

1. Install Vercel CLI
2. You'll need to run ! vercel login yourself (interactive browser login)
3. Deploy with ! vercel --prod from the project root
4. Add DATABASE_URL as an environment variable in Vercel dashboard

Now follow these steps in order:

- Step 1 — Log in to Vercel (opens browser):
! vercel login

- Step 2 — Deploy (run from the repo root):
! cd /Users/robertsp/workspace/abprakse-sono-forms && vercel --prod
When prompted: confirm the project name, keep defaults, set framework to Next.js.

- Step 3 — Add the database secret in the Vercel dashboard:

After deploy finishes, go to your project → Settings → Environment Variables and add:
- Name: DATABASE_URL
- Value: (the Neon connection string from .env.local)
- Environment: Production, Preview, Development

Step 4 — Redeploy so the env var takes effect:
! cd /Users/robertsp/workspace/abprakse-sono-forms && vercel --prod


## Deployment example
```
$ vercel login
$ vercel --prod
Vercel CLI 59.16.0 (Node.js 24.10.0)
  Inspect         https://vercel.com/polarisltd-6471s-projects/abprakse-sono-forms/8QtXdLKHAgssrYH6X6ScPsgjpyei
  Production      https://abprakse-sono-forms-p9cm5qfq3-polarisltd-6471s-projects.vercel.app
▲ Aliased         https://abprakse-sono-forms.vercel.app

✓ Ready in 29s
```
deployment 2026-11-02
```
Nociceptors-MacBook-Air:abprakse-sono-forms robertsp$ vercel --prod
Vercel CLI 65.2.0
  Inspect         https://vercel.com/polarisltd-6471s-projects/abprakse-sono-forms/HLMJpt7gbQCHytT7xVGE84C4BkgG
  Production      https://abprakse-sono-forms-60tuj4kty-polarisltd-6471s-projects.vercel.app
▲ Aliased         https://abprakse-sono-forms.vercel.app

```




