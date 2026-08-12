# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech rules

- Pure HTML/CSS/JS only — no frameworks, no build tools, no bundlers, no package manager.
- Keep exactly three files: `index.html`, `style.css`, `app.js`. Do not split into additional files or add new top-level source files.
- Data persistence is `localStorage` only — no backend, no database, no network calls for storing app data.
- Run/test by opening `index.html` directly in a browser; there is no build or test command.
