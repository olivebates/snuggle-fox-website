# SnuggleFox website

Static HTML, CSS and JavaScript, hosted on GitHub Pages. Serve this directory over HTTP to preview it; no frontend build is needed.

## Play statistics on Convex

`convex-client.js` connects the home page and game pages to:

- Cloud API: https://animated-curlew-362.convex.cloud
- HTTP Actions: https://animated-curlew-362.convex.site

The website uses the [Convex HTTP API](https://docs.convex.dev/http-api/) on the cloud URL. Custom HTTP Actions and a browser API key are not needed.

`convex/schema.js` defines anonymous play sessions and aggregate totals per game. `convex/plays.js` exposes `plays:stats` and `plays:record`. Each loaded game gets a random session ID; repeated saves only add the increase in its cumulative duration. Playtime saves every 30 seconds, when switching games, and when hiding or leaving the page. Returning to a tab continues the same session. Failed saves retry while the page remains open, including saves for stopped games. Browser shutdown or a prolonged connection failure can still lose unsaved time.

The supplied deployment is a **development deployment**, and the website deliberately connects to that exact URL. To update it after logging in to Convex:

```powershell
npm ci
$env:CONVEX_DEPLOYMENT = 'dev:animated-curlew-362'
npx convex dev --once
```

Use `npm run convex:dev` to watch for backend changes after configuration. `npm run convex:deploy` targets the project's production deployment, which may have a different URL; update `convex-client.js` if moving the website there. Do not put deploy keys or account tokens in frontend files. Local `.env` files and generated Convex files are ignored by Git.

Run `npm test` for tracking and aggregation tests. These tests cover retries, duplicate load events, out-of-order saves, game switching, tab lifecycle saves and API failures.

The old Supabase configuration and SQL remain as references for historical data. The pages no longer load the Supabase SDK or client. Historical Supabase totals have not been imported into Convex; the previous Supabase hostname did not resolve when checked.
