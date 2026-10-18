# Changelog

All notable changes to **Thanh'S LLM Arena** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0] - 2026-10-18

### Added
- **Mobile Off-Canvas Navigation:** Implemented responsive slide-out navigation drawer with smooth backdrop blur for viewports $\le$ 768px (Android and iOS).
- **Mobile Hamburger Button:** Added dedicated `☰` trigger in the top company banner to open and close sidebar history on phone screens.
- **Dynamic Viewport Height (`100dvh`):** Added dynamic viewport units to prevent Android/Chrome address bar shifts and ensure the bottom composer is always pinned to the screen.

### Fixed
- **Markdown List Indentation:** Fixed an issue where ordered list numbers (e.g. `10.`) clipped outside the container by adding `28px` list padding, `7px` item separation, and `18px` divider margins.
- **Message Card Breathing Room:** Increased chat card padding to `18px 24px` for comfortable readability across mobile and desktop displays.
- **Mobile Layout Squeezing:** Fixed mobile layout collapse where the desktop sidebar previously occupied 65% of small screens; sidebar now defaults to closed on mobile.

---

## [1.3.0] - 2026-10-18

### Added
- **Dual-Cloud Production Deployment:**
  - **Render Web Service:** Hosted Express streaming backend on Render (`https://thanh-llm-arena.onrender.com`) bound to `0.0.0.0` with wildcard CORS support.
  - **Netlify CDN Frontend:** Distributed Vite production bundle with automated GitHub continuous deployment.
- **Direct & Proxy Dual-Routing:** Configured client-side runtime API discovery (`apiConfig.ts`) combined with `netlify.toml` and `public/_redirects` proxying (`/api/*` $\to$ Render backend).
- **Automated Deploy Script:** Added `"start": "tsx src/server/index.ts"` to `package.json` for one-click cloud runtime starts.

### Fixed
- **HTTP 404 on Chat Stream:** Resolved relative path routing errors on static CDN hosts by resolving `apiConfig` to the live backend URL in production.

---

## [1.2.0] - 2026-10-18

### Added
- **Fixed Top Company Banner:** Mounted persistent enterprise header banner at the very top middle of the main screen (`.workspace-main`), visible across both hero landing and chat threads.
- **Enterprise Brand Assets:** Integrated generated high-resolution banner graphics and monogram icon for **"Thanh'S LLM Arena"**.
- **Header Telemetry & Security Lock:** Surfaced live arena indicators (`● LIVE ARENA`), network matrix (`OPENCODE · GEMINI · OPENROUTER`), model status (`6 ACTIVE + AUTO`), and direct access to admin settings.

### Changed
- **Streamlined Landing Layout:** Removed redundant inner hero banner graphic to let the fixed top company banner act as the primary visual anchor.

---

## [1.1.0] - 2026-10-18

### Added
- **Password Protection (`thanh2099`):** Protected Settings modal and backend provider status endpoint behind admin passkey `thanh2099`.
- **Session Authentication:** Added `sessionStorage` caching (`thanh_admin_auth_v1`) with instant lock toggle in sidebar and header.
- **Widescreen Workspace Layout:** Expanded maximum chat thread and composer width to `min(94vw, 1500px)` for high-density modern monitors.
- **Keyboard Shortcut:** Added <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> shortcut to open the authenticated Settings modal.

### Changed
- **Prose & Editor Typography:** Tuned font sizes to compact 13px/13.5px body copy with tabular monospace telemetry badges.

---

## [1.0.0] - 2026-10-17

### Added
- **Initial Release:** Complete Arena.ai + Antigravity Direct Chat clone.
- **7 Model Catalog:** Support for `auto`, `beam-free`, `deepseek-v4.1-flash`, `glm-5.3-flash`, `space-bunny`, `gemini-3.8-flash`, and `qwen3.8-flash`.
- **Tri-Provider Streaming Proxy:** Real-time Server-Sent Events (SSE) streaming supporting OpenAI (`reasoning_content`), Anthropic (`thinking_delta`), and Gemini (`thought: true`) protocols.
- **Zero-Drop Failover Engine:** Automatic cascading failover across OpenCode Go, Google Gemini, and OpenRouter upon HTTP 401, 429, 500, or stream timeout.
- **Technical Broadsheet Dark Theme:** Editorial dark aesthetic using `#09090b` canvas, hairline borders (`#27272a`), `Instrument Serif`, `Plus Jakarta Sans`, and `JetBrains Mono`.
- **Antigravity Multi-Row Composer:** Attachment strip (images + files), model selector dropdown, routing override pills, and stop button.
- **Interactive Features:** Collapsible reasoning trace drawer (`▸ THINKING TRACE`), copyable syntax-highlighted code blocks, localStorage thread history with rename/delete.
