# LICENSE NOTICE — Read this first

## What this folder contains

Font files and extracted design values from **Claude Desktop 44.7.2**, a product of
Anthropic PBC, installed on this machine as an MSIX package.

## Copyright status of the fonts

The three Anthropic typefaces are **proprietary, all rights reserved**. This is
stated in the fonts' own embedded metadata:

| Field | Value |
|---|---|
| `copyright` | `Copyright 2025-2026 Anthropic PBC` |
| `manufacturer` | `BSPK LLC` |
| `designer` | `BSPK x Geist x Anthropic` |
| `license_desc` (nameID 13) | *absent* |
| `license_url` (nameID 14) | *absent* |
| `trademark` (nameID 7) | *absent* |

The absence of a `license_desc` / `license_url` field is itself informative: an
open-licensed font normally carries an OFL or Apache notice here. These carry
nothing, and the only rights statement present is the Anthropic copyright line.

For comparison, Claude's `third-party-notices.txt` **does** list its genuinely
open-licensed fonts (OpenDyslexic under SIL OFL 1.1, Atkinson Hyperlegible Next,
KaTeX's fonts under MIT). The three Anthropic families are **not** in that file,
because they are not third-party open-source components — they are Anthropic's
own brand assets.

**Conclusion: these are not open-source fonts.** They are shipped inside a
proprietary application for that application's own use.

## What you may and may not do

| Use | Status |
|---|---|
| Inspect the files, read the metadata, study the design | OK — this is the stated purpose of this folder |
| Install locally to compare against your own type choices | OK for private study |
| Use in a throwaway prototype you never distribute | Grey area; keep it off any network |
| Ship the font files in a product, app, or website | **Not permitted** |
| Redistribute, mirror, or commit the files to a public repo | **Not permitted** |
| Subset/rename and pass off as your own font | **Not permitted** |
| Use as a webfont on a public site | **Not permitted** |

The `fsType` flag in the font's `OS/2` table reads `0` (*Installable Embedding*).
That flag governs **embedding in documents** — it does not grant redistribution
rights, and it does not override the copyright.

## The design values are a separate question

The typographic numbers in `css/tokens.css` (sizes, line heights, the
360/460/540/560 weight ramp) are **facts about how a UI is built**. Individual
numbers like `0.875rem` or `"wght" 540` are not protectable expression. What you
learn from them — that a custom weight ramp between Regular and Medium is what
gives the interface its texture — is a legitimate design insight you can apply
with any variable font you do have rights to.

What is *not* fine is reproducing Claude's interface wholesale, including its
brand marks and distinctive visual identity, in a shipping product.

## The practical path

If you like this typography and want it in a real project, you need a
**variable font you can license**. The closest available options:

- **Geist** (Vercel, SIL OFL 1.1) — the Anthropic fonts were designed
  `BSPK x Geist x Anthropic`, so Geist is the closest publicly available
  relative, and it is genuinely free.
- **Inter** (SIL OFL 1.1) — variable, `wght` + `opsz` axes, very close in
  structure; apply the same 360/460/540/560 ramp to it.
- **Instrument Sans**, **General Sans**, **Söhne** (commercial) — similar
  neo-grotesque feel.

Applying Claude's *weight ramp* and *size ratios* to Inter or Geist will get you
most of the perceived character, legally.

---

*Generated for local study. The extraction process is documented in
`metadata/manifest.json` (source filenames, hashes, axes).*
