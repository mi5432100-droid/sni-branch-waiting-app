# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech rules

- Pure HTML/CSS/JS only — no build tools, no bundlers, no package manager, no backend.
- Keep exactly three source files: `index.html`, `style.css`, `app.js`. Do not split into additional top-level source files. Image assets (e.g. `branch-interior.jpg`, `pb-profile.jpg`) are content, not source, and are fine.
- Data persistence is `localStorage` only (used by the waiting-app state). The 투자 대시보드(투자자 성향 / 자산 구조) is currently static sample data with no persistence — it is not user-editable.
- Run/test by opening `index.html` directly in a browser; there is no build or test command. The app works fully offline.
