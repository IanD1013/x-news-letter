# X Reader

A serverless reader for the X (Twitter) accounts you care about.
GitHub Actions fetches their public posts on a schedule, commits the JSON into this repository, and builds a static GitHub Pages site from it.
New posts are pushed to your phone through ntfy.sh.
Accounts are followed and unfollowed from the site itself, YouTube style, with the list of subscriptions in the left column.

## How it works

```
GitHub Actions (hourly at :17, on push, or manually)
  update  : scripts/pipeline.ts fetches FxEmbed → normalizes → writes public/data/*.json → commits
            npm run build → dist/ (with feed.xml / atom.xml / feed.json / 404.html)
  deploy  : actions/deploy-pages
  notify  : scripts/notify.ts → ntfy.sh (only when there are new posts and the deploy succeeded)

GitHub Pages static site (Vite + React + Tailwind + PWA)
  reads data/*.json at runtime
  follow / unfollow edits creators.json through the GitHub API, which triggers the pipeline
```

- The source is FxEmbed's public API (`api.fxtwitter.com`): free, no authentication, full text for long posts.
  It sits behind the `PostSource` interface in `scripts/source/` so it can be swapped later.
- Fetched: the account's original posts, their own threads, and reposts. Replies to other people are skipped.
- Data is sharded by month in `public/data/posts/YYYY-MM.json`. `index.json` is the table of contents and `latest.json` holds the newest 100 posts.
- `creators.json` is the list of followed accounts.
  The pipeline backfills accounts that have no data yet and drops the posts of accounts that were removed.

## Deploy

1. Create a **public** GitHub repository (public repositories get unlimited Actions minutes) and push this project to `main`.
2. Repository Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Repository Settings → Secrets and variables → Actions → New repository secret:
   `NTFY_TOPIC` = a long random string (for example `xreader-7f3a9c2e1b`).
   The topic name is the only "password": anyone who knows it can receive and send notifications.
   To use a self-hosted ntfy server, also add a repository **variable** `NTFY_SERVER` with its URL. Without it, ntfy.sh is used.
4. Install the ntfy app (iOS / Android) and subscribe to that topic.
5. Actions → pipeline → Run workflow.
   Tick `skip_notify` on the first run so the whole backfill is not announced as new posts.
6. Once all three jobs are green, open the Pages URL.
   On a phone, use "Add to Home Screen" to install it as a PWA.

The pipeline then runs every hour.
GitHub's scheduled runs are often a few minutes late, sometimes more.
Pages has a 10 minute CDN cache, so a new post can take up to about 10 minutes to show up.

## Following accounts

The left column lists the accounts you follow.
Click one to read only their posts, click **All posts** to go back.
On a phone the list opens from the menu button in the header.

To follow or unfollow from the site you need a GitHub token, because the site is static and the list lives in `creators.json` in this repository:

1. Open [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
2. Repository access: **Only select repositories** → this repository.
3. Repository permissions: **Contents → Read and write**. Nothing else.
4. Paste the token into the site's Settings (gear icon).
   It is stored only in that browser's localStorage and sent only to `api.github.com`.

**Follow an account** at the bottom of the list takes a handle or a profile URL and commits the change.
That push starts the pipeline, which backfills the account (about 25 pages, roughly 500 posts) and redeploys.
Until then the account shows as "Fetching posts…".
Unfollowing removes the account from `creators.json`; the next run deletes its posts from the data.

You can also edit `creators.json` by hand: add or remove `{ "screen_name": "xxx" }` entries and push.

## Local development

```bash
npm install
cp .env.example .env          # optional: BACKFILL_PAGES, VITE_REPO
npm run pipeline              # fetch data into public/data/
npm run dev                   # http://localhost:5173
npm run build && npm run preview
npm run typecheck
```

Set `VITE_REPO=owner/name` in `.env` to make follow and unfollow work against your repository in the dev server.
The workflow sets it automatically for the deployed site.

Test a notification:

```bash
NTFY_TOPIC=<topic> SITE_URL=http://localhost:4173/ NEW_IDS=<a post id> npm run notify
```

## Layout

```
.github/workflows/pipeline.yml   fetch → deploy → notify
creators.json                    followed accounts
scripts/                         TypeScript run directly by Node 24
  pipeline.ts  store.ts  notify.ts  postbuild.ts  source/
src/                             frontend
  shared/      types and sort rules shared by scripts and frontend
  lib/         data loading, preferences, GitHub API, subscriptions state
  components/  UI components
public/data/                     data files (generated and committed by the pipeline)
```
