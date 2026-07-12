# Paper Todo

A minimalist productivity web app (tasks, habits, trackers, stats). Built by Dhanish as a personal tool and shipped publicly. Core values: no sign-in, no ads, no setup, data stays on device.

## How to run

There is no build system. Open `app.html` directly in a browser (or `index.html` for the landing page). All JS is plain `<script src>` and CSS is one `<link rel="stylesheet">`.

**Never suggest** webpack, vite, npm, bundlers, ES modules, or `import`/`export`. All JS lives in global scope.

## File layout

```
Paper-Todo/
├── index.html         landing page (SEO homepage; deliberately named index.html)
├── app.html           the actual app shell (~407 lines, HTML + script tags only)
├── styles.css         all app CSS (~2,379 lines)
├── privacy.html       privacy policy
├── js/
│   ├── state.js       globals + saveState/loadState (localStorage key tracker_v1)
│   ├── utils.js       escHtml, formatDate, catStyle, catPill, priorityBadge
│   ├── habits.js      toggleHabitMode, toggleDay, habitDaysLabel, getHabitStreak
│   ├── trackers.js    renderTrackers, openTrackerModal, saveEntry, quickAddEntry
│   ├── earth.js       Earth mode: startEarthMode, solar position, sky canvas
│   ├── categories.js  category modal, color picker, addCategory
│   ├── render.js      renderTable, updateStats, setView, renderStats
│   ├── actions.js     toggleDone, openModal, saveTask, setThemeMode, confetti
│   ├── grid.js        grid view, drag-drop, column resize
│   └── init.js        loadQuote, settings modal, exportCSV, theme init, first render
└── blog/
    ├── index.html
    └── why-i-built-the-simplest-todo-app.html
```

Script load order in `app.html` matters (state → utils → habits → trackers → earth → categories → render → actions → grid → init). Keep new files in the right slot.

## Persistence

All app state lives in `localStorage` under key **`tracker_v1`** as a single JSON blob. `saveState()` writes it; `loadState()` reads it. The persisted shape includes `tasks, categories, catColors, colWidths, nextId, trackers, nextTrackerId, theme, title, uiConfig`. `uiConfig` carries view/filter/sort state across sessions.

No server, no accounts. (See "Active work" below for the in-progress cloud sync.)

## Editing rules

- **Edit `styles.css` or the relevant `js/` file**, not `app.html`. Don't put CSS/JS back inline.
- Use **explicit `.html` filenames** in hrefs (e.g. `blog/index.html`, not `blog/`). The app must work when opened via `file://`.
- New JS functions are global; reference them directly from inline `onclick=`.

## Copy and design rules

- **No em dashes** anywhere — copy, titles, meta. Use commas, colons, or restructure.
- **Don't name competitor apps** (Notion, Todoist, TickTick, Things, Obsidian, Bear, Apple Reminders). Refer to them generically as "productivity apps".
- **Don't add interactive animations / scroll effects / parallax / hover flourishes** to the landing page. Only the existing faux app preview is interactive. Keep it calm.

## Landing page (`index.html`)

Self-contained: same fonts/colors/dot-grid as the app, with a sandboxed faux-app preview implemented inline in a `<script>` block. The faux preview is independent of `js/` — it has its own `TASKS` array and helpers (`fauxRelDate`, `fauxDueClass`, `fauxToggle`, drag-drop between Yesterday/Today/Tomorrow/In 2 days).

SEO meta: canonical, OG, Twitter Card, JSON-LD `WebApplication` schema. Placeholder domain: `https://papertodo.app/`. Primary target keyword: **"minimalist todo app no login"**.

## Active work

Branch `supabase-sync` is checked out for adding optional Clerk + Supabase cloud sync. Design principles for this feature:

- No sign-in gate. App opens exactly as today for signed-out users.
- `localStorage` writes are unchanged regardless of auth state.
- Sync is background, non-blocking. One subtle button in the header is the only UI addition.
- Signed-out users: data never leaves the device.

Full plan (credentials, SQL schema, `sync.js` design, sync button states) is in the `project_supabase_sync` auto-memory. As of now, no sync code is written yet — `js/sync.js` does not exist and `app.html` has no Clerk/Supabase CDN tags.
