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
`patient_birth_year`, `visit_date` and all calculated fields are stripped
server-side in `src/lib/templates.ts` before anything is written, because
template rows are permanent while statement rows are purged after 12 hours.
That guarantee is covered by a check across all ten forms:

```bash
npm run test:templates
```

Design notes, API contract and edge cases: `specs/feature-templates.md`.

## Database schema

```sql
-- Doctors
CREATE TABLE doctors (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
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
```

Common fields (`patient_name`, `patient_birth_year`, `visit_date`) are top-level columns. All other form-specific fields are stored in `form_data` JSONB.

`UNIQUE (form_id, slot)` is the concurrency control for template slots: two
doctors saving at the same instant cannot take the same slot — one insert
fails and is retried against the next free one.

## Data retention

Form data (the `statements` table — patient visits and their `form_data`)
is temporary: any row older than **12 hours** (by `created_at`) is deleted
automatically. Everything else (`doctors`, `form_templates`, form definitions,
etc.) is permanent and is never touched by this job.

Because `form_templates` rows are permanent, they are the one place where text
entered on a form can outlive the retention window — which is why the template
sanitiser strips patient fields server-side (see **Templates** above).

The purge itself lives at `POST /api/cron/purge-statements`
(`src/app/api/cron/purge-statements/route.ts`). It's guarded by a
`CRON_SECRET`: set it as an environment variable on the Vercel project
(Settings → Environment Variables) and the route only accepts calls whose
`Authorization` header is `Bearer <CRON_SECRET>`. If it's left unset (e.g.
local dev), the route allows unauthenticated calls so it's easy to test.

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
deployment 2026-09-14
```
Nociceptors-MacBook-Air:abprakse-sono-forms robertsp$ vercel --prod
Vercel CLI 59.16.0 (Node.js 24.10.0)
  Inspect         https://vercel.com/polarisltd-6471s-projects/abprakse-sono-forms/2krj7fN1piFvzwFveswRDKMptgAS
  Production      https://abprakse-sono-forms-6bjrymfuw-polarisltd-6471s-projects.vercel.app
▲ Aliased         https://abprakse-sono-forms.vercel.app

✓ Ready in 21s

Next steps:
- Automatically deploy changes on every push by connecting Git:
  vercel git connect
- Check the deployment response:
  vercel curl https://abprakse-sono-forms-6bjrymfuw-polarisltd-6471s-projects.vercel.app
- View build logs:
  vercel inspect abprakse-sono-forms-6bjrymfuw-polarisltd-6471s-projects.vercel.app --logs
- Create a new deployment from the same source:
  vercel redeploy abprakse-sono-forms-6bjrymfuw-polarisltd-6471s-projects.vercel.app


```




