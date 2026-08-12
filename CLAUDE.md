# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech rules

- Pure HTML/CSS/JS only — no build tools, no bundlers, no package manager. The Supabase JS client is loaded via a plain `<script src="https://.../supabase-js">` CDN tag, not npm.
- Keep exactly three source files: `index.html`, `style.css`, `app.js`. Do not split into additional top-level source files. Image assets (e.g. `branch-interior.jpg`, `pb-profile.jpg`) are content, not source, and are fine.
- Data persistence: the 관심종목(watchlist) feature reads/writes a Supabase table (see below). Everything else (메모/notes, 체크리스트/checklist, waiting-app state) stays in `localStorage` only — no backend for those.
- Supabase project URL and anon/public key are read from constants near the top of `app.js`. The anon key is safe to expose client-side only because Row Level Security is enabled on the table — never disable RLS to "fix" a permissions error.
- Run/test by opening `index.html` directly in a browser; there is no build or test command. The watchlist panel requires network access to Supabase; the rest of the app still works offline.
