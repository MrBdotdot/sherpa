# Staging Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a fully isolated `staging.sherpa.app` environment so code changes can be tested against a separate Supabase project before being promoted to production.
**Architecture:** A `staging` branch in GitHub deploys automatically to a Vercel staging environment via branch-based deployments; the staging environment points at a brand-new Supabase project (isolated data) and is served under `staging.sherpa.app` via a Cloudflare CNAME; production (`main` → `sherpa.app`) is untouched by all of this.
**Tech Stack:** GitHub branch protection, Vercel branch environments + custom domains + environment variables, Supabase dashboard (new project + SQL Editor), Cloudflare DNS

---

### Task 1: Create the `staging` branch in GitHub

**Manual steps**

- [ ] Step 1: Open the repository on GitHub. On the repository home page, click the branch selector dropdown (currently showing `main`). Type `staging` in the search box. Click **Create branch: staging from main**. The `staging` branch is now created at the same commit as `main`.

- [ ] Step 2: Verify: In GitHub → Code tab, confirm the branch dropdown shows `staging` as an available branch and that the commit SHA shown for `staging` matches the current tip of `main`.

- [ ] Step 3: No commit — this task creates a branch, not a code change.

---

### Task 2: Protect `main` and `staging` branches in GitHub

**Manual steps**

- [ ] Step 1: In GitHub, go to the repository → **Settings** → **Branches** (left sidebar, under "Code and automation").

- [ ] Step 2: Under "Branch protection rules", click **Add rule**.

- [ ] Step 3: Configure the rule for `main`:
  - **Branch name pattern:** `main`
  - Check **Require a pull request before merging**
  - Under that, check **Require approvals** — set to `0` (PR required but solo developer, no second reviewer required)
  - Check **Do not allow bypassing the above settings**
  - Leave all other options unchecked
  - Click **Create**.

- [ ] Step 4: Click **Add rule** again to add a second rule for `staging`:
  - **Branch name pattern:** `staging`
  - Check **Require a pull request before merging**
  - Under that, check **Require approvals** — set to `0`
  - Check **Do not allow bypassing the above settings**
  - Click **Create**.

- [ ] Step 5: Verify: On the Branches settings page, both `main` and `staging` now show a lock icon or "Protected" label under "Branch protection rules".

- [ ] Step 6: Verify direct-push is blocked: Attempt to push a commit directly to `main` from a local terminal (e.g., `git push origin main`). GitHub should reject it with `remote: error: GH006: Protected branch update failed`.

---

### Task 3: Create the Supabase staging project

**Manual steps**

- [ ] Step 1: Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in.

- [ ] Step 2: Click **New project**. Fill in:
  - **Name:** `sherpa-staging`
  - **Database password:** Generate a strong password and save it in your password manager immediately — this is needed to connect directly to Postgres if ever required.
  - **Region:** Select the same region as the production project (`fgbrxofiznkfhxdzjsjh`) — visible on the production project's Settings → General page.
  - **Pricing plan:** Free tier is sufficient.
  - Click **Create new project**.

- [ ] Step 3: Wait for the project to finish provisioning (approximately 1–2 minutes). The dashboard will show a spinner and then transition to the project home page.

- [ ] Step 4: Verify: The new project (`sherpa-staging`) appears in the Supabase dashboard project list and its status shows **Active** (green).

---

### Task 4: Run SQL migrations on the staging Supabase project

**Manual steps — run all five SQL files in order using the Supabase SQL Editor**

All SQL files live in the `supabase/` directory of this repository. Open each file, copy its full contents, and paste into the SQL Editor on the staging project. Run files in the exact order listed below.

- [ ] Step 1: In the staging project dashboard, click **SQL Editor** in the left sidebar.

- [ ] Step 2: Run `supabase/schema.sql`:
  - Open `supabase/schema.sql` in your editor and copy its entire contents.
  - In the Supabase SQL Editor, click **New query**, paste the contents, and click **Run** (or press Ctrl+Enter).
  - Expected: query completes with no errors; the bottom panel shows a success message.

- [ ] Step 3: Run `supabase/add-storage.sql`:
  - Open `supabase/add-storage.sql`, copy all contents.
  - New query in SQL Editor → paste → Run.
  - Expected: success with no errors.

- [ ] Step 4: Run `supabase/add-public-read.sql`:
  - Open `supabase/add-public-read.sql`, copy all contents.
  - New query → paste → Run.
  - Expected: success with no errors.

- [ ] Step 5: Run `supabase/fix-public-read-recursion.sql`:
  - Open `supabase/fix-public-read-recursion.sql`, copy all contents.
  - New query → paste → Run.
  - Expected: success with no errors.

- [ ] Step 6: Run `supabase/add-auth.sql`:
  - Open `supabase/add-auth.sql`, copy all contents.
  - New query → paste → Run.
  - Expected: success with no errors.

- [ ] Step 7: Verify the schema applied correctly: In the staging project, go to **Table Editor** in the left sidebar. Confirm the same tables visible in production are now present in staging (e.g. `games`, `cards`, and any other tables defined in `schema.sql`).

---

### Task 5: Collect staging Supabase credentials

**Manual steps — you will need these values for Task 6**

- [ ] Step 1: In the staging Supabase project dashboard, go to **Settings** (gear icon, bottom of left sidebar) → **API**.

- [ ] Step 2: Copy the following three values and keep them in a scratch document for use in Task 6:
  - **Project URL** — labeled "Project URL", looks like `https://<ref>.supabase.co`. This is the value for `NEXT_PUBLIC_SUPABASE_URL`.
  - **Anon / public key** — labeled "anon public", in the "Project API keys" section. This is the value for `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - **Service role key** — labeled "service_role secret", also in "Project API keys" (click the eye icon to reveal). This is the value for `SUPABASE_SERVICE_ROLE_KEY`. Treat this as a secret — do not share it or commit it.

- [ ] Step 3: Verify: All three values start with the correct format:
  - URL: `https://` followed by a ~20-character ref, then `.supabase.co`
  - Anon key: begins with `sb_publishable_` (new Supabase key format)
  - Service role key: a long JWT string beginning with `eyJ`

---

### Task 6: Configure the Vercel staging environment

**Manual steps**

- [ ] Step 1: Open the Vercel dashboard at [https://vercel.com/dashboard](https://vercel.com/dashboard). Select the Sherpa project.

- [ ] Step 2: Go to **Settings** → **Environments** (left sidebar). Vercel shows the built-in environments: Production and Preview.

- [ ] Step 3: Click **Add Environment** (or the equivalent button). Name it `Staging`. Set the **Git branch** field to `staging`. Save.

- [ ] Step 4: Now add environment variables for the **Staging** environment. Go to **Settings** → **Environment Variables**. For each variable below, click **Add**, set the **Environment** dropdown to `Staging` only, enter the name and value, and save.

  Add these variables scoped to **Staging only**:

  | Variable | Value |
  |---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | The staging Supabase Project URL from Task 5 |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The staging anon/public key from Task 5 |
  | `SUPABASE_SERVICE_ROLE_KEY` | The staging service role key from Task 5 |
  | `NEXT_PUBLIC_BASE_DOMAIN` | `staging.sherpa.app` |
  | `NEXT_PUBLIC_SHERPA_BUILD_DOMAIN` | `staging.sherpa.build` (or leave unset — subdomain routing is not needed on staging; omitting it is safe) |
  | `NEXT_PUBLIC_SENTRY_DSN` | Same DSN as production — copy from the Production environment variable of the same name |
  | `RESEND_API_KEY` | Same key as production — copy from the Production environment variable of the same name |

  Note: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_BASE_DOMAIN` **must differ** from production. The Sentry DSN and Resend key are shared.

- [ ] Step 5: Verify: In **Settings** → **Environment Variables**, confirm all seven variables listed above appear with the scope `Staging` (not Production or Preview). Confirm production still has its own separate values for the Supabase variables and `NEXT_PUBLIC_BASE_DOMAIN=sherpa.app`.

---

### Task 7: Assign `staging.sherpa.app` as the custom domain for the staging environment

**Manual steps**

- [ ] Step 1: In the Vercel project, go to **Settings** → **Domains**.

- [ ] Step 2: Click **Add Domain**. Enter `staging.sherpa.app`. Click **Add**.

- [ ] Step 3: Vercel will prompt for which Git branch or environment this domain belongs to. Select the **Staging** environment (the one configured in Task 6 pointing at the `staging` branch). Confirm.

- [ ] Step 4: Vercel will display the DNS configuration it needs. It will require a CNAME record: `staging` → `cname.vercel-dns.com`. Note this down — it is added in Task 8.

- [ ] Step 5: The domain will show as "Invalid configuration" until the DNS record is added. That is expected at this step.

---

### Task 8: Add the `staging` CNAME record in Cloudflare

**Manual steps**

- [ ] Step 1: Go to [https://dash.cloudflare.com](https://dash.cloudflare.com) and sign in. Select the `sherpa.app` zone.

- [ ] Step 2: Go to **DNS** → **Records** in the left sidebar.

- [ ] Step 3: Click **Add record**. Fill in:
  - **Type:** `CNAME`
  - **Name:** `staging`
  - **Target:** `cname.vercel-dns.com`
  - **Proxy status:** Proxied (orange cloud — enabled)
  - **TTL:** Auto
  - Click **Save**.

- [ ] Step 4: Verify: The new record appears in the DNS records table as:
  - `CNAME` | `staging` | `cname.vercel-dns.com` | Proxied

- [ ] Step 5: Wait 1–2 minutes for DNS propagation. Then go back to Vercel → **Settings** → **Domains** and confirm `staging.sherpa.app` now shows a green checkmark or "Valid configuration" status.

---

### Task 9: Verify Sentry environment tagging on staging

**Context:** The staging environment uses the same Sentry DSN as production. Sentry uses an `environment` tag to separate staging errors from production errors. The Sentry Next.js SDK automatically reads `VERCEL_ENV` (set by Vercel to `preview` for non-production deployments) and uses it as the environment tag. However, to get a clean `staging` label instead of `preview`, this task confirms what tag is being applied and optionally overrides it.

**Files:**
- Check: `sentry.client.config.ts`
- Check: `sentry.server.config.ts`
- Check: `sentry.edge.config.ts`

- [ ] Step 1: Open `sentry.client.config.ts`. Check whether `environment` is explicitly set in the `Sentry.init({})` call.
  - If it reads `environment: process.env.NEXT_PUBLIC_SENTRY_ENV` or similar, add a `NEXT_PUBLIC_SENTRY_ENV=staging` environment variable in the Vercel Staging environment (same process as Task 6 Step 4) and set `NEXT_PUBLIC_SENTRY_ENV=production` in the Production environment.
  - If no `environment` key is present, the SDK defaults to `VERCEL_ENV`, which Vercel sets to `preview` for the staging branch. In this case, add an explicit `environment` field: `environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.VERCEL_ENV ?? "development"` and add the Vercel env vars as described above.
  - Apply the same change to `sentry.server.config.ts` and `sentry.edge.config.ts`.

- [ ] Step 2: If `sentry.client.config.ts` already has `environment: process.env.VERCEL_ENV` set (the wizard default) and you are satisfied that `preview` is an acceptable label in Sentry for staging errors, skip the env var addition — no change needed.

- [ ] Step 3: If any code changes were made in Step 1: Run `npm run build`. Expected: clean build with no type errors.

- [ ] Step 4: If any code changes were made: Commit with message:
  ```
  feat: set explicit Sentry environment tag for staging vs production
  ```

---

### Task 10: End-to-end verification

**Manual steps — no code changes**

- [ ] Step 1: From a local branch (created from `staging`), make a trivial change — e.g., add a comment to any file. Push the branch to GitHub. Open a pull request targeting `staging`. Merge the PR into `staging`.

- [ ] Step 2: Go to the Vercel dashboard → the Sherpa project → **Deployments** tab. Confirm a new deployment is triggered automatically for the `staging` branch. Wait for it to complete (status: **Ready**).

- [ ] Step 3: Open `https://staging.sherpa.app` in a browser. Confirm:
  - The page loads without errors.
  - You can sign in (auth against staging Supabase).
  - The app is functional — create a test game, add a card, confirm it saves.

- [ ] Step 4: Confirm staging Supabase isolation: Open the staging Supabase dashboard → Table Editor → `games`. Confirm the test game created in Step 3 appears there. Open the production Supabase dashboard → Table Editor → `games`. Confirm the test game does NOT appear there.

- [ ] Step 5: Confirm production is unaffected: Open `https://sherpa.app` in a browser. Confirm it still loads correctly with existing production data.

- [ ] Step 6: Attempt to push directly to `main` from local:
  ```bash
  git checkout main
  git commit --allow-empty -m "test: direct push block"
  git push origin main
  ```
  Expected: GitHub rejects with `GH006: Protected branch update failed`.

- [ ] Step 7: Attempt to push directly to `staging` from local:
  ```bash
  git checkout staging
  git commit --allow-empty -m "test: direct push block"
  git push origin staging
  ```
  Expected: GitHub rejects with `GH006: Protected branch update failed`.

- [ ] Step 8: Open a PR from `staging` → `main`. Merge it. Go to Vercel → Deployments. Confirm a new production deployment triggered for `main`. Confirm `https://sherpa.app` reflects the change from the trivial commit.

- [ ] Step 9: If Sentry environment tagging was configured in Task 9 — go to [https://sentry.io](https://sentry.io) → the Sherpa project → **Issues**. In the environment filter dropdown, confirm both `staging` (or `preview`) and `production` appear as selectable environments.

---

## Environment variable reference summary

| Variable | Production value | Staging value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fgbrxofiznkfhxdzjsjh.supabase.co` | New staging project URL from Task 5 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anon key | Staging anon key from Task 5 |
| `SUPABASE_SERVICE_ROLE_KEY` | Production service role key | Staging service role key from Task 5 |
| `NEXT_PUBLIC_BASE_DOMAIN` | `sherpa.app` | `staging.sherpa.app` |
| `NEXT_PUBLIC_SHERPA_BUILD_DOMAIN` | `sherpa.build` | `staging.sherpa.build` (or omit) |
| `NEXT_PUBLIC_SENTRY_DSN` | Production DSN | Same DSN — tagged `staging` via `NEXT_PUBLIC_SENTRY_ENV` |
| `RESEND_API_KEY` | Production Resend key | Same key |
