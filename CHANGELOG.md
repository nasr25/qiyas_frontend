# Changelog — Qiyas Frontend (Vue SPA)

All notable changes to the frontend are recorded here, newest first.
Format: **Added / Changed / Fixed / Deps**.

## [Unreleased]

### Added
- **Email Logs** page (`/admin/email-logs`, super-admin): list of sent/failed
  emails with recipient + status, and a modal showing the full email **body**
  (sandboxed iframe) and error.
- Employee dashboard: Extension Requests + Upcoming Deadlines cards.
- **My Department Standards** page (`/my-standards`): one employee page with
  department standards, requirements, inline upload/submit, request extension,
  comments, auditor notes, and a stat strip.
- Role-based sidebar navigation per role; data-driven dev quick-login panel
  (name · role · department) from `/auth/dev-users`.
- Sortable tables across the app (`useSort` + `SortableTh`); standards
  pagination; per-standard department assignment; notifications page.
- Green design system (centralized tokens, theme-aware charts); responsive,
  RTL/LTR, dark mode.

### Changed
- Extensions status and Audit Log action columns now translated (AR/EN).
- Reports "Cycle Summary" renders proper KPIs/breakdown (was raw JSON).
- Settings page maps flat fields ↔ backend group/key schema.

### Fixed
- Reports crash on object-shaped tabs (`useSort` non-array guard); reports
  By-Status 422.
- Extension approve/reject send `reviewer_notes`; cycle copy sends
  `copy_from_cycle`; min-length enforced on reject/extension reasons.
- Notification bell route ("path not found"); blank standard number; settings
  "field is required"; branding logo now shown in shell + login.

### Deps
- Force `postcss-selector-parser` 7.1.2 via overrides; `vite` ^8.0.8.
