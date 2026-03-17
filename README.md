# ISD Project Prototype

Interactive prototype for collaboration/workspace graph flows.

## Local Development

1. Install dependencies:
   - `npm ci`
2. Start the dev server:
   - `npm run dev`

In dev mode, the app uses `/api/store` backed by `data/runtimeStore.json` through the Vite middleware in `vite.config.js`. If `data/runtimeStore.json` does not exist, it is seeded from `data/defaultData.json`.

## Quality Checks

- Run lint only:
  - `npm run lint`
- Run lint + production build gate:
  - `npm run check`

This repository includes `.github/workflows/quality-gate.yml`, which runs on pull requests and pushes to `master`. PRs should pass this Quality Gate before merge.

## Storage Modes

- Default in dev (`npm run dev`): `api` mode (`/api/store` GET/PUT persisted to `data/runtimeStore.json`).
- Default in production/static build: `local` mode (browser `localStorage`).
- Local storage key for static sharing: `amytis_store_local_v1`.

Query params for troubleshooting:

- `?store=api` to force API mode.
- `?store=local` to force browser-local mode.
- `?resetStore=1` to clear the shared local key before app boot.

## Reliable Publish Pipeline (GitHub Pages)

This repository includes `.github/workflows/deploy-pages.yml`:

- Trigger: every push to `master`.
- Steps: `npm ci` -> `npm run build` -> upload `dist` -> deploy to GitHub Pages.
- Concurrency: only the newest in-progress Pages deploy is kept.

### One-Time GitHub Setup

1. In GitHub, open `Settings` -> `Pages`.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `master` once to trigger first deployment.

## Ongoing Release Flow

### Publish a new static version

1. Commit your prototype changes.
2. Push to `master`.
3. Wait for the `Deploy Static Prototype` workflow to finish.

### Verify deployment

1. Open the Actions tab and confirm the latest run succeeded.
2. Open the GitHub Pages URL shown in the deploy step output.
3. Hard refresh once (`Ctrl+F5`) to avoid stale cached assets.

### Rollback

1. Revert the problematic commit(s).
2. Push the revert commit to `master`.
3. Wait for the workflow to deploy the reverted build.
