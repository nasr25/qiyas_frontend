# Government Compliance Management Platform — Frontend (Vue 3 SPA)

Vue 3 / Vite frontend for the multi-program compliance platform. Qiyas is
the first compliance program; after login users land on the Program
Selection page (`/programs`) and enter a program at
`/programs/:programCode/...`. See the backend repo's
`docs/multi-program-architecture.md` for the full architecture, and
`docs/roles-and-scopes.md` for the role/access model this UI reflects.

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

## Repository quality checks

Both checks are **manual and local**. The GitHub Actions workflows that once
ran them have been retired; nothing runs them on your behalf.

### Commit-message validation

Install once per clone:

```bash
git config core.hooksPath .githooks
```

`.githooks/commit-msg` delegates to `scripts/validate-commit-message.sh`,
which rejects a new commit message that credits an automated assistant,
carries a session identifier, or claims automated generation. It allows
legitimate human co-authors and ordinary text containing the letters "AI".

It validates **only the message being written** — existing published commits
are intentionally out of scope and are never rewritten.

### Offline / CDN verification

The production bundle must contain no external runtime dependency. Run after
any dependency change:

```bash
npm run build
CDN_HOSTS='fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|ajax\.googleapis\.com|fonts\.bunny\.net|cdn\.tailwindcss\.com'
grep -rEo "$CDN_HOSTS" dist/ && echo "CDN dependency reintroduced" || echo "clean"
```

Only `http://www.w3.org` (SVG namespaces), `https://vuejs.org` (an error
link) and your own configured API host should appear in the output — none of
those is a fetched runtime asset. All fonts are bundled locally.

The prohibited-reference scan lives in the backend repository
(`bash scripts/scan-prohibited-references.sh`); this repository's copy was
removed when its only caller, the CI workflow, was retired.
