# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech rules

- Pure HTML/CSS/JS only — no build tools, no bundlers, no package manager. A CDN `<script>` include (Supabase JS client) is the one exception, added so the waiting queue can sync in real time across different people's devices — see below.
- Keep exactly three source files: `index.html`, `style.css`, `app.js`. Do not split into additional top-level source files. Image assets (e.g. `branch-interior.jpg`, `pb-profile.jpg`) are content, not source, and are fine.
- Data persistence:
  - **Shared/real-time data** (the branch waiting queue — who's registered, queue position, live counts) lives in **Supabase** (Postgres + Realtime), because multiple customers on different phones/computers need to see the same live state. Only the anon/publishable key is ever used client-side — never the service_role key or DB password.
  - **Personal/device-only data** (투자 대시보드의 투자자 성향·자산 구조·상속증여 입력, PB 업무 탭의 처리완료 상태, 사전 준비 체크리스트/메모) stays in `localStorage`, since it's per-person input with no need to sync across devices.
- Run/test by opening `index.html` directly in a browser; there is no build or test command. The waiting queue requires network access to Supabase; the rest of the app still works offline.
