# GhostSplit Chat Theme for Twitch.tv (Chromium)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-purple.svg)](./manifest.json)

A Chromium-based browser extension (Chrome / Edge / Brave / Opera /
Vivaldi) that restyles native [twitch.tv](https://www.twitch.tv) chat to
match the look of [GhostSplit](https://ghostsplit.gg)'s split-view chat
client: tighter rows, softer per-user colors, and GhostSplit-style
text-pill badges (`SUB`, `MOD`, `VIP`, `FOUNDER`, `TURBO`, `PRIME`,
`BITS`, `ADMIN`, `STAFF`, `GMOD`) instead of Twitch's noisy image
badges.

Works equally well on **native Twitch chat** and on chat rendered by
**[7TV](https://7tv.app)**, so 7TV / BetterTTV / FrankerFaceZ can stay
installed alongside without breaking.

> Looking for the Firefox build? See
> [`Facilitra/ghostsplit-twitch-chat-firefox-extension`](https://github.com/Facilitra/ghostsplit-twitch-chat-firefox-extension).

---

## Features

- **Text-pill badges.** Image badges next to usernames are replaced by
  compact role chips. Custom channel sub badges and event badges are
  hidden so the row stays clean. Spanish + English Twitch UI locales are
  both mapped.
- **Softened username colors.** Neon-bright Twitch usernames are mixed
  toward a light base and re-darkened if luminance gets too high, using
  the exact `softenChatColor` algorithm from GhostSplit's own chat
  client. Reds, yellows, and lime greens stay readable on dark
  backgrounds.
- **Tighter row chrome.** Reduced padding, baseline-aligned badges +
  usernames, hard cap on inline emote heights (no more giant 7TV emotes
  blowing up rows), faint card tint on each row.
- **Distinct system rows.** Channel-points redeems get a red card with a
  4 px left rail; watch-streak milestones get a gold card; sub / resub /
  raid notices get a blue notice card. Inline reply quotes get a purple
  left rail so threads read as separate.
- **Dual-DOM coverage.** Every visual rule is paired between the native
  Twitch DOM (`.chat-line__message`) and 7TV's overridden DOM
  (`.seventv-message`).
- **Loaded indicator.** A small ghost icon is injected into Twitch's top
  navigation as a passive "loaded" badge, with a hover tooltip. The icon
  is non-interactive — this extension is purely visual.
- **No data collection.** No network requests, no analytics, no tracking,
  no storage permission. The extension only needs `host_permissions` for
  `*://*.twitch.tv/*`. Everything else is pure DOM + CSS.

## Preserved on purpose

- Bits / cheer button
- Channel-points balance + claim flow
- All redeem / milestone / cheer-tier badges
- Twitch's collapse-chat and theatre-mode controls
- 7TV's settings button and emote menu

---

## Install

### Chrome / Edge / Brave / Opera / Vivaldi (sideload, unpacked)

1. Download a `.zip` from the [Releases
   page](https://github.com/Facilitra/ghostsplit-twitch-chat-chromium-extension/releases)
   (or build one yourself, see [Build](#build) below) and extract it to
   a folder you'll keep around — Chromium loads the extension *from
   that folder*, so deleting it disables the extension.
2. Open your browser's extensions page:
   - Chrome / Brave / Vivaldi → `chrome://extensions`
   - Edge → `edge://extensions`
   - Opera → `opera://extensions`
3. Toggle **Developer mode** on (top-right corner).
4. Click **Load unpacked** and pick the extracted folder (the one that
   contains `manifest.json`).
5. Visit any twitch.tv channel — the chat is restyled instantly. A
   small ghost icon appears in the top-right of the nav.

### Chrome Web Store

Submission to the [Chrome Web
Store](https://chromewebstore.google.com/) pending.

---

## Project layout

```
.
├── manifest.json                  Manifest V3 declaration
├── content/
│   ├── twitch-chat.css            All visual rules, scoped to .chat-shell;
│   │                              dark + light theme overrides
│   ├── badges.js                  Image badge → text pill swap, username
│   │                              color softening, theme detection
│   └── toggle.js                  Top-nav "loaded" indicator
├── icons/
│   └── icon-{48,96,128}.png       Generated icons (referenced by manifest)
├── README.md
└── LICENSE
```

Icon generation is shared between the Chromium and Firefox repos via a
single `generate-icons.mjs` script kept one level up (sibling of both
repo folders) alongside `ghost-icon.svg`. Run `npm run icons` from this
repo to regenerate the PNGs into `./icons/`.

### Inter-script protocol

`badges.js` and `toggle.js` communicate via two custom `window` events
so neither has to expose globals across content-script worlds:

| Event       | Sender      | Receiver    | Effect                                                           |
| ----------- | ----------- | ----------- | ---------------------------------------------------------------- |
| `gs-rescan` | `toggle.js` | `badges.js` | Re-process every existing message row (currently unused, but the listener is in place for a future on/off control). |
| `gs-reset`  | `toggle.js` | `badges.js` | Undo all DOM-level changes: remove pills, restore hidden image badge wrappers, drop softened username colors. |

---

## Build

A `.zip` archive (the format the Chrome Web Store accepts, and what
users sideload via "Load unpacked" after extracting) is produced by
[Mozilla's `web-ext`](https://github.com/mozilla/web-ext), invoked
through `npx` so there are no permanent runtime dependencies.

```bash
npm run lint     # validate manifest + content scripts via web-ext lint
npm run build    # produce ./dist/<name>-<version>.zip
npm run icons    # (re)generate icons/icon-{48,96,128}.png from the SVG
```

`web-ext` is Firefox-flavored but it lints any Manifest V3 extension
just fine; we pass `--self-hosted` so it doesn't fail on Chrome-only
configurations that AMO would otherwise reject.

The build excludes `scripts/`, `package.json`, `README.md`, `LICENSE`,
`.gitignore`, `dist/`, and `.github/` from the package — only the actual
extension files (`manifest.json`, `content/*`, `icons/*.png`) ship to
users.

`npm run icons` requires `sharp`. Install it once with
`npm install sharp --no-save` (it's intentionally not declared in
`package.json` because it's only needed when re-rasterizing the icon).
Re-run only when `../ghost-icon.svg` (the shared SVG source one level up)
changes.

---

## Releases

Tagged releases are built and published automatically by the
[`Release` GitHub Actions workflow](./.github/workflows/release.yml).
To cut a new release:

```bash
# bump the version in manifest.json + package.json first, then:
git commit -am "Release v0.1.1"
git tag v0.1.1
git push origin main --tags
```

The workflow lints, builds the extension, and publishes a GitHub
Release at the tag with the `.zip` attached and auto-generated release
notes from the commit log. The `.zip` is the artifact you upload to the
Chrome Web Store; users who want to sideload extract it and load the
folder via "Load unpacked".

Manual dispatch is also available from the Actions tab if you want to
re-run a release for an existing tag.

The lighter [`CI` workflow](./.github/workflows/ci.yml) runs `npm run
lint` + `npm run build` on every push to `main` and on every PR, so
broken commits don't sit unnoticed between releases.

---

## Compatibility notes

- **Chrome / Chromium** 105+ (CSS `:has()` shipped in Chromium 105 and
  the chat theme leans on it for several `:has()` rules — earlier
  versions will load the extension but the styling will look incomplete).
- **Edge** 105+, **Brave** 1.43+, **Opera** 91+, **Vivaldi** 5.4+ (all
  Chromium 105 or later).
- **Twitch locale**: badge mapping handles `es` and `en`. Adding a new
  locale = adding patterns to `BADGE_MAP` in `content/badges.js`.

---

## Privacy

This extension does not:

- send network requests,
- read or write `localStorage` / `sessionStorage` / cookies,
- request `storage`, `tabs`, `webRequest`, `scripting`, or any other
  permission beyond `host_permissions: *://*.twitch.tv/*`,
- include any analytics / telemetry / remote code,
- touch any URL outside twitch.tv.

---

## Contributing

Issues and PRs welcome. The codebase is small and intentionally CSS-first
— anything that can be a CSS rule should be one; JS is reserved for cases
that fundamentally need DOM mutation (current cases: `alt`-text badge
synthesis, color softening).

When adding a new role pill, edit `BADGE_MAP` in `content/badges.js` and
the matching `.gs-badge-<role>` color rule in `content/twitch-chat.css`.

---

## License

[MIT](./LICENSE) © GhostSplit.gg
